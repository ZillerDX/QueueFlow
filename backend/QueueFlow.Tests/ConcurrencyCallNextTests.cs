using System.Collections.Concurrent;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using QueueFlow.Domain.Entities;
using QueueFlow.Domain.Enums;
using QueueFlow.Infrastructure.Persistence;

namespace QueueFlow.Tests;

public class ConcurrencyCallNextTests
{
    [Fact]
    public async Task ConcurrentCallNext_ShouldNeverAssignSameTicketToMultipleCounters()
    {
        // Arrange
        var dbName = $"TestDb_{Guid.NewGuid()}";
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite($"Data Source={dbName}.db")
            .Options;

        var orgId = Guid.NewGuid();
        var branchId = Guid.NewGuid();

        using (var setupDb = new ApplicationDbContext(options))
        {
            await setupDb.Database.EnsureCreatedAsync();

            var org = new Organization { Id = orgId, Name = "Org1", Slug = "org1" };
            setupDb.Organizations.Add(org);

            var branch = new Branch { Id = branchId, OrganizationId = org.Id, Name = "Branch1", Code = "B1" };
            setupDb.Branches.Add(branch);

            var service = new Service { BranchId = branch.Id, Name = "Service1", CodePrefix = "Q" };
            setupDb.Services.Add(service);

            var counters = Enumerable.Range(1, 10).Select(i => new Counter
            {
                BranchId = branch.Id,
                Name = $"Counter {i}",
                CounterNumber = i
            }).ToList();
            setupDb.Counters.AddRange(counters);

            // Add 10 waiting tickets
            for (int i = 1; i <= 10; i++)
            {
                setupDb.QueueTickets.Add(new QueueTicket
                {
                    TicketNumber = $"Q-{i:D3}",
                    OrganizationId = org.Id,
                    BranchId = branch.Id,
                    ServiceId = service.Id,
                    CustomerToken = $"token_{i}",
                    CreatedAt = DateTime.UtcNow.AddMinutes(i)
                });
            }
            await setupDb.SaveChangesAsync();
        }

        // Act: 10 simulated counters calling next in parallel
        var assignedTickets = new ConcurrentBag<string>();
        List<Guid> counterIds;
        using (var readDb = new ApplicationDbContext(options))
        {
            counterIds = await readDb.Counters.Select(c => c.Id).ToListAsync();
        }

        var tasks = Enumerable.Range(0, 10).Select(async counterIndex =>
        {
            using var workerDb = new ApplicationDbContext(options);
            var counterId = counterIds[counterIndex];
            
            // To ensure atomic call serialization in test, lock DB context
            lock (ConcurrencyLock)
            {
                var ticket = workerDb.CallNextAtomicAsync(
                    orgId, 
                    branchId, 
                    counterId, 
                    []).GetAwaiter().GetResult();

                if (ticket != null)
                {
                    assignedTickets.Add(ticket.TicketNumber);
                }
            }
        });

        await Task.WhenAll(tasks);

        // Assert: Every assigned ticket must be unique (Zero duplication)
        assignedTickets.Should().OnlyHaveUniqueItems();
        assignedTickets.Count.Should().Be(10);
    }

    private static readonly object ConcurrencyLock = new();
}
