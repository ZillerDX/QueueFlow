namespace QueueFlow.Domain.Enums;

public enum QueueStatus
{
    Waiting = 0,
    Called = 1,
    Serving = 2,
    Completed = 3,
    Skipped = 4,
    Cancelled = 5,
    NoShow = 6
}

public enum QueuePriority
{
    Normal = 0,
    Priority = 1
}

public enum QueueEventType
{
    QueueCreated,
    QueueCalled,
    QueueRecalled,
    QueueStarted,
    QueueCompleted,
    QueueSkipped,
    QueueCancelled,
    QueueNoShow,
    QueueTransferred,
    PriorityChanged
}
