using QueueFlow.Domain.Entities;
using QueueFlow.Domain.Enums;

namespace QueueFlow.Application.Common;

public interface IApplicationDbContext
{
    Microsoft.EntityFrameworkCore.DbSet<Organization> Organizations { get; }
    Microsoft.EntityFrameworkCore.DbSet<Branch> Branches { get; }
    Microsoft.EntityFrameworkCore.DbSet<Service> Services { get; }
    Microsoft.EntityFrameworkCore.DbSet<Counter> Counters { get; }
    Microsoft.EntityFrameworkCore.DbSet<QueueTicket> QueueTickets { get; }
    Microsoft.EntityFrameworkCore.DbSet<QueueEvent> QueueEvents { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<QueueTicket?> CallNextAtomicAsync(Guid orgId, Guid branchId, Guid counterId, List<Guid> serviceIds, CancellationToken cancellationToken = default);
}

public interface ISignalRNotifier
{
    Task NotifyQueueUpdatedAsync(Guid branchId, object payload);
    Task NotifyCustomerTicketAsync(string customerToken, object payload);
    Task NotifyTicketCalledAsync(Guid branchId, string ticketNumber, int counterNumber, string soundAlertUrl);
}

public interface IEstimatedWaitCalculator
{
    Task<int> CalculateWaitMinutesAsync(Guid branchId, Guid serviceId, int peopleAhead, CancellationToken cancellationToken = default);
}
