using FluentAssertions;
using QueueFlow.Domain.Entities;
using QueueFlow.Domain.Enums;
using QueueFlow.Domain.Exceptions;

namespace QueueFlow.Tests;

public class DomainStateMachineTests
{
    [Fact]
    public void Call_WhenTicketIsWaiting_ShouldSucceedAndTransitionToCalled()
    {
        // Arrange
        var ticket = new QueueTicket
        {
            TicketNumber = "A-001",
            CustomerToken = "token_abc123"
        };
        var counterId = Guid.NewGuid();

        // Act
        ticket.Call(counterId);

        // Assert
        ticket.Status.Should().Be(QueueStatus.Called);
        ticket.CounterId.Should().Be(counterId);
        ticket.CalledAt.Should().NotBeNull();
    }

    [Fact]
    public void StartService_WhenTicketIsWaiting_ShouldThrowInvalidQueueTransitionException()
    {
        // Arrange
        var ticket = new QueueTicket
        {
            TicketNumber = "A-002",
            CustomerToken = "token_abc456"
        };

        // Act
        var act = () => ticket.StartService();

        // Assert
        act.Should().Throw<InvalidQueueTransitionException>()
            .WithMessage("*must be in Called status first*");
    }

    [Fact]
    public void Complete_WhenTicketIsServing_ShouldSucceed()
    {
        // Arrange
        var ticket = new QueueTicket
        {
            TicketNumber = "A-003",
            CustomerToken = "token_abc789"
        };
        ticket.Call(Guid.NewGuid());
        ticket.StartService();

        // Act
        ticket.Complete();

        // Assert
        ticket.Status.Should().Be(QueueStatus.Completed);
        ticket.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public void Cancel_WhenTicketIsServing_ShouldThrowException()
    {
        // Arrange
        var ticket = new QueueTicket
        {
            TicketNumber = "A-004",
            CustomerToken = "token_abc999"
        };
        ticket.Call(Guid.NewGuid());
        ticket.StartService();

        // Act
        var act = () => ticket.Cancel();

        // Assert
        act.Should().Throw<InvalidQueueTransitionException>()
            .WithMessage("*Customer can only cancel tickets while in Waiting status*");
    }

    [Fact]
    public void Priority_WhenUpdated_ShouldElevateOrder()
    {
        // Arrange
        var ticket = new QueueTicket
        {
            TicketNumber = "A-005",
            CustomerToken = "token_priority"
        };

        // Act
        ticket.SetPriority(QueuePriority.Priority);

        // Assert
        ticket.Priority.Should().Be(QueuePriority.Priority);
    }
}
