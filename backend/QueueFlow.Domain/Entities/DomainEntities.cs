using QueueFlow.Domain.Enums;
using QueueFlow.Domain.Exceptions;

namespace QueueFlow.Domain.Entities;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Organization : BaseEntity
{
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public bool IsActive { get; set; } = true;
    public List<Branch> Branches { get; set; } = [];
}

public class Branch : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    public required string Name { get; set; }
    public required string Code { get; set; }
    public string Timezone { get; set; } = "Asia/Bangkok";
    public bool IsActive { get; set; } = true;
    public List<Service> Services { get; set; } = [];
    public List<Counter> Counters { get; set; } = [];
}

public class Service : BaseEntity
{
    public Guid BranchId { get; set; }
    public Branch? Branch { get; set; }
    public required string Name { get; set; }
    public required string CodePrefix { get; set; }
    public int DefaultServiceDurationMinutes { get; set; } = 5;
    public bool IsActive { get; set; } = true;
}

public class Counter : BaseEntity
{
    public Guid BranchId { get; set; }
    public Branch? Branch { get; set; }
    public required string Name { get; set; }
    public int CounterNumber { get; set; }
    public Guid? AssignedServiceId { get; set; }
    public Service? AssignedService { get; set; }
    public bool IsActive { get; set; } = true;
}

public class QueueTicket : BaseEntity
{
    public required string TicketNumber { get; set; }
    public Guid OrganizationId { get; set; }
    public Guid BranchId { get; set; }
    public Guid ServiceId { get; set; }
    public Service? Service { get; set; }
    public Guid? CounterId { get; set; }
    public Counter? Counter { get; set; }
    public required string CustomerToken { get; set; }
    public QueueStatus Status { get; set; } = QueueStatus.Waiting;
    public QueuePriority Priority { get; set; } = QueuePriority.Normal;
    public int EstimatedWaitMinutes { get; set; } = 0;
    public uint Version { get; set; } = 1;

    public DateTime? CalledAt { get; private set; }
    public DateTime? ServingAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public DateTime? CancelledAt { get; private set; }

    public List<QueueEvent> Events { get; set; } = [];

    // FSM State Transition Methods
    public void Call(Guid counterId)
    {
        if (Status != QueueStatus.Waiting && Status != QueueStatus.Skipped)
        {
            throw new InvalidQueueTransitionException($"Cannot call queue from status '{Status}'. Only Waiting or Skipped queues can be called.");
        }

        Status = QueueStatus.Called;
        CounterId = counterId;
        CalledAt = DateTime.UtcNow;
        Version++;
    }

    public void Recall()
    {
        if (Status != QueueStatus.Called)
        {
            throw new InvalidQueueTransitionException($"Cannot recall queue in status '{Status}'. Only Called queues can be recalled.");
        }
        CalledAt = DateTime.UtcNow;
    }

    public void StartService()
    {
        if (Status != QueueStatus.Called)
        {
            throw new InvalidQueueTransitionException($"Cannot start service from status '{Status}'. Queue must be in Called status first.");
        }

        Status = QueueStatus.Serving;
        ServingAt = DateTime.UtcNow;
        Version++;
    }

    public void Complete()
    {
        if (Status != QueueStatus.Serving)
        {
            throw new InvalidQueueTransitionException($"Cannot complete queue from status '{Status}'. Queue must be currently Serving.");
        }

        Status = QueueStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        Version++;
    }

    public void Skip()
    {
        if (Status != QueueStatus.Waiting && Status != QueueStatus.Called)
        {
            throw new InvalidQueueTransitionException($"Cannot skip queue from status '{Status}'.");
        }

        Status = QueueStatus.Skipped;
        Version++;
    }

    public void MarkNoShow()
    {
        if (Status != QueueStatus.Called)
        {
            throw new InvalidQueueTransitionException($"Cannot mark No Show from status '{Status}'. Queue must be Called first.");
        }

        Status = QueueStatus.NoShow;
        Version++;
    }

    public void Cancel()
    {
        if (Status != QueueStatus.Waiting)
        {
            throw new InvalidQueueTransitionException($"Customer can only cancel tickets while in Waiting status. Current status: '{Status}'.");
        }

        Status = QueueStatus.Cancelled;
        CancelledAt = DateTime.UtcNow;
        Version++;
    }

    public void Transfer(Guid targetServiceId)
    {
        if (Status != QueueStatus.Serving && Status != QueueStatus.Called)
        {
            throw new InvalidQueueTransitionException($"Cannot transfer queue from status '{Status}'.");
        }

        ServiceId = targetServiceId;
        CounterId = null;
        Status = QueueStatus.Waiting;
        CalledAt = null;
        ServingAt = null;
        Version++;
    }

    public void SetPriority(QueuePriority newPriority)
    {
        if (Status == QueueStatus.Completed || Status == QueueStatus.Cancelled || Status == QueueStatus.NoShow)
        {
            throw new InvalidQueueTransitionException($"Cannot alter priority for finalized queue ({Status}).");
        }
        Priority = newPriority;
        Version++;
    }
}

public class QueueEvent : BaseEntity
{
    public Guid QueueTicketId { get; set; }
    public QueueTicket? QueueTicket { get; set; }
    public QueueEventType EventType { get; set; }
    public string? UserId { get; set; }
    public string? Metadata { get; set; }
}
