using Microsoft.AspNetCore.SignalR;
using QueueFlow.Application.Common;

namespace QueueFlow.Infrastructure.Realtime;

public class QueueHub : Hub
{
    public async Task JoinBranchGroup(string branchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Branch_{branchId}");
    }

    public async Task LeaveBranchGroup(string branchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Branch_{branchId}");
    }

    public async Task JoinTicketGroup(string customerToken)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Ticket_{customerToken}");
    }
}

public class SignalRNotifier(IHubContext<QueueHub> hubContext) : ISignalRNotifier
{
    public async Task NotifyQueueUpdatedAsync(Guid branchId, object payload)
    {
        await hubContext.Clients.Group($"Branch_{branchId}").SendAsync("QueueUpdated", payload);
    }

    public async Task NotifyCustomerTicketAsync(string customerToken, object payload)
    {
        await hubContext.Clients.Group($"Ticket_{customerToken}").SendAsync("TicketStatusChanged", payload);
    }

    public async Task NotifyTicketCalledAsync(Guid branchId, string ticketNumber, int counterNumber, string soundAlertUrl)
    {
        await hubContext.Clients.Group($"Branch_{branchId}").SendAsync("TicketCalled", new
        {
            TicketNumber = ticketNumber,
            CounterNumber = counterNumber,
            SoundAlertUrl = soundAlertUrl
        });
    }
}
