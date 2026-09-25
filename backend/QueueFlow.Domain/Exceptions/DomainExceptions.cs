namespace QueueFlow.Domain.Exceptions;

public class InvalidQueueTransitionException : Exception
{
    public InvalidQueueTransitionException(string message) : base(message) { }
}

public class ConcurrencyConflictException : Exception
{
    public ConcurrencyConflictException(string message) : base(message) { }
}

public class EntityNotFoundException : Exception
{
    public EntityNotFoundException(string name, object key) 
        : base($"Entity '{name}' with key '{key}' was not found.") { }
}
