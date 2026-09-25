using QueueFlow.Domain.Entities;
using QueueFlow.Domain.Enums;

namespace QueueFlow.Application.DTOs;

public record JoinQueueRequest(Guid BranchId, Guid ServiceId);
public record JoinQueueResponse(
    Guid TicketId,
    string TicketNumber,
    string CustomerToken,
    QueueStatus Status,
    int EstimatedWaitMinutes,
    int PeopleAhead,
    string ServiceName,
    DateTime CreatedAt
);

public record CustomerQueueStatusResponse(
    Guid TicketId,
    string TicketNumber,
    QueueStatus Status,
    int PeopleAhead,
    int EstimatedWaitMinutes,
    int? CounterNumber,
    string? CounterName,
    string? CurrentServingTicket,
    DateTime CreatedAt,
    DateTime? CalledAt,
    Guid BranchId
);

public record CallNextRequest(Guid CounterId, List<Guid>? ServiceIds);

public record TransferQueueRequest(Guid TargetServiceId, string? Note);

public record PriorityUpdateRequest(QueuePriority Priority, string? Reason);

public record CreateCounterRequest(Guid BranchId, string Name, int CounterNumber, Guid? AssignedServiceId = null);
public record UpdateCounterRequest(string Name, int CounterNumber, Guid? AssignedServiceId, bool? IsActive = null);
public record UpdateCounterServiceRequest(Guid? AssignedServiceId);
public record CreateServiceRequest(Guid BranchId, string Name, string CodePrefix, int DefaultServiceDurationMinutes);
public record UpdateServiceRequest(string Name, string CodePrefix, int DefaultServiceDurationMinutes, bool? IsActive = null);
public record UpdateBranchRequest(string Name, string Code, string Timezone);

public record AnalyticsOverviewResponse(
    int TotalWaiting,
    int TotalServing,
    int TotalCompletedToday,
    int TotalNoShowToday,
    int TotalCancelledToday,
    double AverageWaitMinutes,
    double AverageServiceMinutes,
    List<CounterStatusDto> ActiveCounters
);

public record CounterStatusDto(
    Guid CounterId,
    int CounterNumber,
    string CounterName,
    string? CurrentTicketNumber,
    QueueStatus? CurrentTicketStatus,
    DateTime? StartedAt
);
