using Microsoft.EntityFrameworkCore;
using QueueFlow.Application.Common;
using QueueFlow.Domain.Entities;
using QueueFlow.Domain.Enums;

namespace QueueFlow.Application.Services;

public class EstimatedWaitCalculator(IApplicationDbContext db) : IEstimatedWaitCalculator
{
    public async Task<int> CalculateWaitMinutesAsync(Guid branchId, Guid serviceId, int peopleAhead, CancellationToken cancellationToken = default)
    {
        if (peopleAhead <= 0) return 0;

        var service = await db.Services.FirstOrDefaultAsync(s => s.Id == serviceId, cancellationToken);
        int fallbackDuration = service?.DefaultServiceDurationMinutes ?? 5;

        // Query last 10 completed tickets today for this service
        var today = DateTime.UtcNow.Date;
        var recentCompletedTickets = await db.QueueTickets
            .Where(t => t.BranchId == branchId && t.ServiceId == serviceId && t.Status == QueueStatus.Completed && t.ServingAt != null && t.CompletedAt != null && t.CompletedAt >= today)
            .OrderByDescending(t => t.CompletedAt)
            .Take(10)
            .Select(t => new { t.ServingAt, t.CompletedAt })
            .ToListAsync(cancellationToken);

        if (recentCompletedTickets.Count < 3)
        {
            return peopleAhead * fallbackDuration;
        }

        var durations = recentCompletedTickets
            .Select(t => (t.CompletedAt!.Value - t.ServingAt!.Value).TotalMinutes)
            .Where(m => m > 0.5 && m < 120) // Filter out anomalies
            .ToList();

        if (durations.Count == 0) return peopleAhead * fallbackDuration;

        double avgMinutes = durations.Average();
        return (int)Math.Max(1, Math.Round(peopleAhead * avgMinutes));
    }
}
