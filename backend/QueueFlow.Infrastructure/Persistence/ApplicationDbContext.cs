using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using QueueFlow.Application.Common;
using QueueFlow.Domain.Entities;
using QueueFlow.Domain.Enums;
using QueueFlow.Domain.Exceptions;

namespace QueueFlow.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Counter> Counters => Set<Counter>();
    public DbSet<QueueTicket> QueueTickets => Set<QueueTicket>();
    public DbSet<QueueEvent> QueueEvents => Set<QueueEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Unique indexes
        modelBuilder.Entity<Organization>()
            .HasIndex(o => o.Slug)
            .IsUnique();

        modelBuilder.Entity<QueueTicket>()
            .HasIndex(t => t.CustomerToken)
            .IsUnique();

        modelBuilder.Entity<QueueTicket>()
            .HasIndex(t => new { t.BranchId, t.CreatedAt, t.TicketNumber });

        // Concurrency token on Version
        modelBuilder.Entity<QueueTicket>()
            .Property(t => t.Version)
            .IsConcurrencyToken();
    }

    public async Task<QueueTicket?> CallNextAtomicAsync(
        Guid orgId, 
        Guid branchId, 
        Guid counterId, 
        List<Guid> serviceIds, 
        CancellationToken cancellationToken = default)
    {
        // Check provider type: If SQLite or In-Memory (for testing/dev), use serial transaction or lock
        if (Database.IsSqlite() || Database.ProviderName?.Contains("InMemory") == true)
        {
            var query = QueueTickets
                .Include(t => t.Service)
                .Where(t => t.OrganizationId == orgId && t.BranchId == branchId && (t.Status == QueueStatus.Waiting || t.Status == QueueStatus.Skipped));

            if (serviceIds.Count > 0)
            {
                query = query.Where(t => serviceIds.Contains(t.ServiceId));
            }

            var next = await query
                .OrderByDescending(t => t.Priority)
                .ThenBy(t => t.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (next == null) return null;

            next.Call(counterId);
            await SaveChangesAsync(cancellationToken);
            return next;
        }

        // For PostgreSQL in Production: Strict 'FOR UPDATE SKIP LOCKED'
        using var transaction = await Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, cancellationToken);
        try
        {
            var serviceFilter = serviceIds.Count > 0 
                ? $"AND \"ServiceId\" IN ({string.Join(",", serviceIds.Select(id => $"'{id}'"))})" 
                : "";

            var rawSql = $"""
                SELECT * FROM "QueueTickets"
                WHERE "OrganizationId" = '{orgId}'
                  AND "BranchId" = '{branchId}'
                  AND ("Status" = 0 OR "Status" = 4)
                  {serviceFilter}
                ORDER BY "Priority" DESC, "CreatedAt" ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            """;

            var nextTicket = (await QueueTickets.FromSqlRaw(rawSql).ToListAsync(cancellationToken)).FirstOrDefault();
            if (nextTicket == null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return null;
            }

            nextTicket.Call(counterId);
            await SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return nextTicket;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
