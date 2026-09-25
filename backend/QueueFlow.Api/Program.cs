using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QueueFlow.Application.Common;
using QueueFlow.Application.DTOs;
using QueueFlow.Domain.Entities;
using QueueFlow.Domain.Enums;
using QueueFlow.Domain.Exceptions;
using QueueFlow.Infrastructure.Persistence;
using QueueFlow.Infrastructure.Realtime;
using QueueFlow.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Services configuration
builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});
builder.Services.AddScoped<ISignalRNotifier, SignalRNotifier>();
builder.Services.AddScoped<IEstimatedWaitCalculator, QueueFlow.Application.Services.EstimatedWaitCalculator>();

// Check DB Connection
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString) || connectionString.Contains(".db") || connectionString.Contains("sqlite", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddDbContext<ApplicationDbContext>(opt => 
        opt.UseSqlite(connectionString ?? "Data Source=queueflow.db"));
}
else
{
    builder.Services.AddDbContext<ApplicationDbContext>(opt => 
        opt.UseNpgsql(connectionString));
}

builder.Services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrEmpty(origin)) return false;
            try
            {
                var uri = new Uri(origin);
                // Allow localhost / local network for development
                if (uri.Host == "localhost" || uri.Host == "127.0.0.1" || uri.Host.StartsWith("192.168.") || uri.Host.StartsWith("10.")) return true;
                // Allow Vercel preview & production deployments (*.vercel.app)
                if (uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase)) return true;
                // Allow explicitly configured origins
                if (configuredOrigins.Any(o => o.Equals(origin, StringComparison.OrdinalIgnoreCase))) return true;
                return false;
            }
            catch
            {
                return false;
            }
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

var app = builder.Build();

// 2. Middleware & OpenAPI
app.UseCors();
app.MapOpenApi();

// Container Health & Root Information
app.MapGet("/", () => Results.Ok(new
{
    service = "QueueFlow API",
    status = "Running",
    version = "1.0.0",
    docs = "/openapi/v1.json",
    health = "/healthz"
}));

app.MapGet("/healthz", () => Results.Ok(new
{
    status = "Healthy",
    service = "QueueFlow.Api",
    timestamp = DateTime.UtcNow
}));

// Ensure Database Created and Seeded with sample data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.EnsureCreated();

    try
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE \"Counters\" ADD COLUMN \"AssignedServiceId\" TEXT NULL;");
    }
    catch { /* Column already exists */ }

    if (!db.Organizations.Any())
    {
        var defaultOrg = new Organization
        {
            Name = "HealthCare & Service Group",
            Slug = "healthcare-group"
        };
        db.Organizations.Add(defaultOrg);

        var bangkokBranch = new Branch
        {
            OrganizationId = defaultOrg.Id,
            Name = "Bangkok Central Branch",
            Code = "BKK01"
        };
        db.Branches.Add(bangkokBranch);

        var s1 = new Service
        {
            BranchId = bangkokBranch.Id,
            Name = "General Consultation & Screening",
            CodePrefix = "A",
            DefaultServiceDurationMinutes = 4
        };
        var s2 = new Service
        {
            BranchId = bangkokBranch.Id,
            Name = "Payment & Pharmacy",
            CodePrefix = "B",
            DefaultServiceDurationMinutes = 3
        };
        db.Services.AddRange(s1, s2);

        var c1 = new Counter { BranchId = bangkokBranch.Id, Name = "Counter 1", CounterNumber = 1 };
        var c2 = new Counter { BranchId = bangkokBranch.Id, Name = "Counter 2", CounterNumber = 2 };
        var c3 = new Counter { BranchId = bangkokBranch.Id, Name = "Counter 3", CounterNumber = 3 };
        db.Counters.AddRange(c1, c2, c3);

        db.SaveChanges();
    }
}

// 3. SignalR Hub Mapping
app.MapHub<QueueHub>("/hubs/queue");

// 4. API Endpoints

// Customer Public APIs
app.MapGet("/api/branches", async (bool? all, ApplicationDbContext db) =>
{
    bool includeAll = all == true;
    var branches = await db.Branches
        .Where(b => b.IsActive)
        .Select(b => new
        {
            b.Id,
            b.Name,
            b.Code,
            b.Timezone,
            Services = b.Services
                .Where(s => includeAll || s.IsActive)
                .OrderBy(s => s.CodePrefix)
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.CodePrefix,
                    s.DefaultServiceDurationMinutes,
                    s.IsActive
                }).ToList(),
            Counters = b.Counters
                .Where(c => includeAll || c.IsActive)
                .OrderBy(c => c.CounterNumber)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.CounterNumber,
                    c.AssignedServiceId,
                    c.IsActive,
                    AssignedServiceName = c.AssignedService != null ? c.AssignedService.Name : null,
                    AssignedServicePrefix = c.AssignedService != null ? c.AssignedService.CodePrefix : null
                }).ToList()
        })
        .ToListAsync();
    return Results.Ok(branches);
});

app.MapPost("/api/queues", async (
    [FromBody] JoinQueueRequest request,
    ApplicationDbContext db,
    IEstimatedWaitCalculator waitCalculator,
    ISignalRNotifier notifier) =>
{
    var branch = await db.Branches.FindAsync(request.BranchId);
    var service = await db.Services.FindAsync(request.ServiceId);

    if (branch == null || service == null)
    {
        return Results.NotFound(new { message = "Branch or Service not found." });
    }

    if (!service.IsActive)
    {
        return Results.BadRequest(new { message = "บริการนี้ปิดให้บริการชั่วคราว ไม่สามารถออกบัตรคิวได้ (This service is currently closed)" });
    }

    var today = DateTime.UtcNow.Date;
    int todayCount = await db.QueueTickets
        .CountAsync(t => t.BranchId == request.BranchId && t.ServiceId == request.ServiceId && t.CreatedAt >= today);

    // Sequence runs 01 to 999 (e.g. A01..A99..A100..A999) and rolls over / reruns after 999 back to 01
    int seqNumber = (todayCount % 999) + 1;
    string prefix = (service.CodePrefix ?? "A").Trim().TrimEnd('-');
    string ticketNumber = $"{prefix}{seqNumber:D2}";
    string token = TokenGenerator.GenerateUrlSafeToken();

    int peopleAhead = await db.QueueTickets
        .CountAsync(t => t.BranchId == request.BranchId && 
                         t.ServiceId == request.ServiceId && 
                         t.Status == QueueStatus.Waiting);

    int waitMinutes = await waitCalculator.CalculateWaitMinutesAsync(branch.Id, service.Id, peopleAhead);

    var ticket = new QueueTicket
    {
        TicketNumber = ticketNumber,
        OrganizationId = branch.OrganizationId,
        BranchId = branch.Id,
        ServiceId = service.Id,
        CustomerToken = token,
        EstimatedWaitMinutes = waitMinutes
    };

    db.QueueTickets.Add(ticket);
    db.QueueEvents.Add(new QueueEvent
    {
        QueueTicketId = ticket.Id,
        EventType = QueueEventType.QueueCreated,
        Metadata = $"Issued ticket {ticketNumber}"
    });

    await db.SaveChangesAsync();

    // Realtime notification to branch display and staff
    await notifier.NotifyQueueUpdatedAsync(branch.Id, new { action = "ticket_created", ticketNumber });

    var response = new JoinQueueResponse(
        ticket.Id,
        ticket.TicketNumber,
        ticket.CustomerToken,
        ticket.Status,
        ticket.EstimatedWaitMinutes,
        peopleAhead,
        service.Name,
        ticket.CreatedAt
    );

    return Results.Created($"/api/queues/{token}", response);
});

app.MapGet("/api/queues/{token}", async (
    string token,
    ApplicationDbContext db,
    IEstimatedWaitCalculator waitCalculator) =>
{
    var ticket = await db.QueueTickets
        .Include(t => t.Service)
        .Include(t => t.Counter)
        .FirstOrDefaultAsync(t => t.CustomerToken == token);

    if (ticket == null) return Results.NotFound(new { message = "Ticket not found." });

    int peopleAhead = 0;
    int estimatedWait = 0;

    if (ticket.Status == QueueStatus.Waiting)
    {
        peopleAhead = await db.QueueTickets
            .CountAsync(t => t.BranchId == ticket.BranchId &&
                             t.ServiceId == ticket.ServiceId &&
                             t.Status == QueueStatus.Waiting &&
                             t.CreatedAt < ticket.CreatedAt);

        estimatedWait = await waitCalculator.CalculateWaitMinutesAsync(ticket.BranchId, ticket.ServiceId, peopleAhead);
    }

    // Get current serving ticket for this service or branch
    var currentServing = await db.QueueTickets
        .Where(t => t.BranchId == ticket.BranchId && t.Status == QueueStatus.Serving)
        .OrderByDescending(t => t.ServingAt)
        .Select(t => t.TicketNumber)
        .FirstOrDefaultAsync();

    var response = new CustomerQueueStatusResponse(
        ticket.Id,
        ticket.TicketNumber,
        ticket.Status,
        peopleAhead,
        estimatedWait,
        ticket.Counter?.CounterNumber,
        ticket.Counter?.Name,
        currentServing,
        ticket.CreatedAt,
        ticket.CalledAt,
        ticket.BranchId
    );

    return Results.Ok(response);
});

app.MapPost("/api/queues/{token}/cancel", async (
    string token,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var ticket = await db.QueueTickets.FirstOrDefaultAsync(t => t.CustomerToken == token);
    if (ticket == null) return Results.NotFound(new { message = "Ticket not found." });

    try
    {
        ticket.Cancel();
        db.QueueEvents.Add(new QueueEvent
        {
            QueueTicketId = ticket.Id,
            EventType = QueueEventType.QueueCancelled,
            Metadata = "Customer self-cancelled via web"
        });
        await db.SaveChangesAsync();

        await notifier.NotifyCustomerTicketAsync(token, new { status = "Cancelled" });
        await notifier.NotifyQueueUpdatedAsync(ticket.BranchId, new { action = "ticket_cancelled", ticketNumber = ticket.TicketNumber });

        return Results.Ok(new { message = "Ticket successfully cancelled." });
    }
    catch (InvalidQueueTransitionException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// Staff APIs
app.MapPost("/api/staff/queues/next", async (
    [FromBody] CallNextRequest request,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var counter = await db.Counters.Include(c => c.Branch).FirstOrDefaultAsync(c => c.Id == request.CounterId);
    if (counter == null) return Results.NotFound(new { message = "Counter not found." });

    var serviceIds = request.ServiceIds ?? [];
    if (serviceIds.Count == 0 && counter.AssignedServiceId.HasValue)
    {
        serviceIds = [counter.AssignedServiceId.Value];
    }

    var nextTicket = await db.CallNextAtomicAsync(
        counter.Branch!.OrganizationId,
        counter.BranchId,
        counter.Id,
        serviceIds);

    if (nextTicket == null)
    {
        return Results.Ok(new { message = "No waiting tickets available." });
    }

    db.QueueEvents.Add(new QueueEvent
    {
        QueueTicketId = nextTicket.Id,
        EventType = QueueEventType.QueueCalled,
        Metadata = $"Called to Counter {counter.CounterNumber}"
    });
    await db.SaveChangesAsync();

    // Push realtime events
    await notifier.NotifyTicketCalledAsync(counter.BranchId, nextTicket.TicketNumber, counter.CounterNumber, "/audio/ding.mp3");
    await notifier.NotifyCustomerTicketAsync(nextTicket.CustomerToken, new
    {
        status = "Called",
        counterNumber = counter.CounterNumber,
        counterName = counter.Name
    });
    await notifier.NotifyQueueUpdatedAsync(counter.BranchId, new { action = "ticket_called", ticketId = nextTicket.Id });

    return Results.Ok(nextTicket);
});

app.MapPost("/api/staff/queues/{id:guid}/recall", async (
    Guid id,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var ticket = await db.QueueTickets.Include(t => t.Counter).FirstOrDefaultAsync(t => t.Id == id);
    if (ticket == null) return Results.NotFound();

    try
    {
        ticket.Recall();
        db.QueueEvents.Add(new QueueEvent
        {
            QueueTicketId = ticket.Id,
            EventType = QueueEventType.QueueRecalled,
            Metadata = $"Recalled at Counter {ticket.Counter?.CounterNumber}"
        });
        await db.SaveChangesAsync();

        if (ticket.Counter != null)
        {
            await notifier.NotifyTicketCalledAsync(ticket.BranchId, ticket.TicketNumber, ticket.Counter.CounterNumber, "/audio/ding.mp3");
            await notifier.NotifyCustomerTicketAsync(ticket.CustomerToken, new
            {
                status = "Called",
                counterNumber = ticket.Counter.CounterNumber,
                recalled = true
            });
        }

        return Results.Ok(ticket);
    }
    catch (InvalidQueueTransitionException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

app.MapPost("/api/staff/queues/{id:guid}/start", async (
    Guid id,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var ticket = await db.QueueTickets.FindAsync(id);
    if (ticket == null) return Results.NotFound();

    try
    {
        ticket.StartService();
        db.QueueEvents.Add(new QueueEvent
        {
            QueueTicketId = ticket.Id,
            EventType = QueueEventType.QueueStarted,
            Metadata = "Started serving"
        });
        await db.SaveChangesAsync();

        await notifier.NotifyCustomerTicketAsync(ticket.CustomerToken, new { status = "Serving" });
        await notifier.NotifyQueueUpdatedAsync(ticket.BranchId, new { action = "ticket_started", ticketId = ticket.Id });

        return Results.Ok(ticket);
    }
    catch (InvalidQueueTransitionException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

app.MapPost("/api/staff/queues/{id:guid}/complete", async (
    Guid id,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var ticket = await db.QueueTickets.FindAsync(id);
    if (ticket == null) return Results.NotFound();

    try
    {
        ticket.Complete();
        db.QueueEvents.Add(new QueueEvent
        {
            QueueTicketId = ticket.Id,
            EventType = QueueEventType.QueueCompleted,
            Metadata = "Service completed"
        });
        await db.SaveChangesAsync();

        await notifier.NotifyCustomerTicketAsync(ticket.CustomerToken, new { status = "Completed" });
        await notifier.NotifyQueueUpdatedAsync(ticket.BranchId, new { action = "ticket_completed", ticketId = ticket.Id });

        return Results.Ok(ticket);
    }
    catch (InvalidQueueTransitionException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

app.MapPost("/api/staff/queues/{id:guid}/skip", async (
    Guid id,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var ticket = await db.QueueTickets.FindAsync(id);
    if (ticket == null) return Results.NotFound();

    try
    {
        ticket.Skip();
        db.QueueEvents.Add(new QueueEvent
        {
            QueueTicketId = ticket.Id,
            EventType = QueueEventType.QueueSkipped,
            Metadata = "Staff skipped queue"
        });
        await db.SaveChangesAsync();

        await notifier.NotifyCustomerTicketAsync(ticket.CustomerToken, new { status = "Skipped" });
        await notifier.NotifyQueueUpdatedAsync(ticket.BranchId, new { action = "ticket_skipped", ticketId = ticket.Id });

        return Results.Ok(ticket);
    }
    catch (InvalidQueueTransitionException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

app.MapPost("/api/staff/queues/{id:guid}/no-show", async (
    Guid id,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var ticket = await db.QueueTickets.FindAsync(id);
    if (ticket == null) return Results.NotFound();

    try
    {
        ticket.MarkNoShow();
        db.QueueEvents.Add(new QueueEvent
        {
            QueueTicketId = ticket.Id,
            EventType = QueueEventType.QueueNoShow,
            Metadata = "Customer did not show up"
        });
        await db.SaveChangesAsync();

        await notifier.NotifyCustomerTicketAsync(ticket.CustomerToken, new { status = "NoShow" });
        await notifier.NotifyQueueUpdatedAsync(ticket.BranchId, new { action = "ticket_noshow", ticketId = ticket.Id });

        return Results.Ok(ticket);
    }
    catch (InvalidQueueTransitionException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

app.MapPost("/api/staff/queues/{id:guid}/transfer", async (
    Guid id,
    [FromBody] TransferQueueRequest request,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var ticket = await db.QueueTickets.FindAsync(id);
    if (ticket == null) return Results.NotFound();

    try
    {
        ticket.Transfer(request.TargetServiceId);
        db.QueueEvents.Add(new QueueEvent
        {
            QueueTicketId = ticket.Id,
            EventType = QueueEventType.QueueTransferred,
            Metadata = $"Transferred to Service {request.TargetServiceId}. Note: {request.Note}"
        });
        await db.SaveChangesAsync();

        await notifier.NotifyCustomerTicketAsync(ticket.CustomerToken, new { status = "Waiting", transferred = true });
        await notifier.NotifyQueueUpdatedAsync(ticket.BranchId, new { action = "ticket_transferred", ticketId = ticket.Id });

        return Results.Ok(ticket);
    }
    catch (InvalidQueueTransitionException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

app.MapPut("/api/staff/queues/{id:guid}/priority", async (
    Guid id,
    [FromBody] PriorityUpdateRequest request,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var ticket = await db.QueueTickets.FindAsync(id);
    if (ticket == null) return Results.NotFound();

    try
    {
        ticket.SetPriority(request.Priority);
        db.QueueEvents.Add(new QueueEvent
        {
            QueueTicketId = ticket.Id,
            EventType = QueueEventType.PriorityChanged,
            Metadata = $"Priority updated to {request.Priority}. Reason: {request.Reason}"
        });
        await db.SaveChangesAsync();

        await notifier.NotifyQueueUpdatedAsync(ticket.BranchId, new { action = "priority_changed", ticketId = ticket.Id });

        return Results.Ok(ticket);
    }
    catch (InvalidQueueTransitionException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
});

// Manager & Analytics APIs
app.MapGet("/api/analytics/overview", async (
    [FromQuery] Guid branchId,
    ApplicationDbContext db) =>
{
    var today = DateTime.UtcNow.Date;

    var tickets = await db.QueueTickets
        .Where(t => t.BranchId == branchId && t.CreatedAt >= today)
        .ToListAsync();

    int totalWaiting = tickets.Count(t => t.Status == QueueStatus.Waiting);
    int totalServing = tickets.Count(t => t.Status == QueueStatus.Serving);
    int totalCompleted = tickets.Count(t => t.Status == QueueStatus.Completed);
    int totalNoShow = tickets.Count(t => t.Status == QueueStatus.NoShow);
    int totalCancelled = tickets.Count(t => t.Status == QueueStatus.Cancelled);

    var completedWithTimes = tickets
        .Where(t => t.Status == QueueStatus.Completed && t.ServingAt != null && t.CompletedAt != null)
        .ToList();

    double avgServiceTime = completedWithTimes.Count > 0
        ? completedWithTimes.Average(t => (t.CompletedAt!.Value - t.ServingAt!.Value).TotalMinutes)
        : 0;

    var calledWithTimes = tickets
        .Where(t => t.CalledAt != null)
        .ToList();

    double avgWaitTime = calledWithTimes.Count > 0
        ? calledWithTimes.Average(t => (t.CalledAt!.Value - t.CreatedAt).TotalMinutes)
        : 0;

    var counters = await db.Counters
        .Where(c => c.BranchId == branchId && c.IsActive)
        .ToListAsync();

    var activeCounters = new List<CounterStatusDto>();
    foreach (var c in counters)
    {
        var currentTicket = await db.QueueTickets
            .Where(t => t.CounterId == c.Id && (t.Status == QueueStatus.Called || t.Status == QueueStatus.Serving))
            .OrderByDescending(t => t.CalledAt)
            .FirstOrDefaultAsync();

        activeCounters.Add(new CounterStatusDto(
            c.Id,
            c.CounterNumber,
            c.Name,
            currentTicket?.TicketNumber,
            currentTicket?.Status,
            currentTicket?.ServingAt ?? currentTicket?.CalledAt
        ));
    }

    var overview = new AnalyticsOverviewResponse(
        totalWaiting,
        totalServing,
        totalCompleted,
        totalNoShow,
        totalCancelled,
        Math.Round(avgWaitTime, 1),
        Math.Round(avgServiceTime, 1),
        activeCounters
    );

    return Results.Ok(overview);
});

app.MapGet("/api/staff/queues/active", async (
    [FromQuery] Guid branchId,
    ApplicationDbContext db) =>
{
    var today = DateTime.UtcNow.Date;
    var activeTickets = await db.QueueTickets
        .Where(t => t.BranchId == branchId && t.CreatedAt >= today && 
                    (t.Status == QueueStatus.Waiting || t.Status == QueueStatus.Called || t.Status == QueueStatus.Serving || t.Status == QueueStatus.Skipped))
        .OrderByDescending(t => t.Priority)
        .ThenBy(t => t.CreatedAt)
        .Select(t => new
        {
            t.Id,
            t.TicketNumber,
            t.Status,
            t.Priority,
            t.EstimatedWaitMinutes,
            t.CounterId,
            t.CreatedAt,
            Service = t.Service != null ? new { t.Service.Id, t.Service.Name, t.Service.CodePrefix } : null,
            Counter = t.Counter != null ? new { t.Counter.Id, t.Counter.Name, t.Counter.CounterNumber } : null
        })
        .ToListAsync();

    return Results.Ok(activeTickets);
});

// Admin Management Endpoints
app.MapPost("/api/admin/services", async (
    [FromBody] CreateServiceRequest request,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var branch = await db.Branches.FindAsync(request.BranchId);
    if (branch == null) return Results.NotFound(new { message = "Branch not found." });

    var prefix = request.CodePrefix.Trim().ToUpperInvariant();
    if (string.IsNullOrWhiteSpace(prefix))
    {
        return Results.BadRequest(new { message = "กรุณาระบุรหัสตัวอักษรย่อ เช่น A, B, C (Code prefix is required)" });
    }

    // "ชื่อรหัสตัวอักษรย่อ (เช่น A, B, C) ห้ามซ้ำกัน มีเพียงชื่อประเภทบริการ ซ้ำกันได้"
    bool prefixExists = await db.Services.AnyAsync(s => s.BranchId == branch.Id && s.CodePrefix == prefix);
    if (prefixExists)
    {
        return Results.BadRequest(new { message = $"รหัสตัวอักษรย่อ '{prefix}' มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น (Code prefix '{prefix}' is already in use)" });
    }

    var service = new Service
    {
        BranchId = branch.Id,
        Name = request.Name.Trim(),
        CodePrefix = prefix,
        DefaultServiceDurationMinutes = request.DefaultServiceDurationMinutes > 0 ? request.DefaultServiceDurationMinutes : 5
    };

    db.Services.Add(service);
    await db.SaveChangesAsync();

    // Notify all connected clients in this branch
    await notifier.NotifyQueueUpdatedAsync(branch.Id, new { action = "service_created", serviceId = service.Id, name = service.Name });

    return Results.Created($"/api/admin/services/{service.Id}", service);
});

app.MapPost("/api/admin/counters", async (
    [FromBody] CreateCounterRequest request,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var branch = await db.Branches.FindAsync(request.BranchId);
    if (branch == null) return Results.NotFound(new { message = "Branch not found." });

    int counterNum = request.CounterNumber;
    if (counterNum <= 0)
    {
        var existingNumbers = await db.Counters.Where(c => c.BranchId == branch.Id).Select(c => c.CounterNumber).ToListAsync();
        counterNum = existingNumbers.Count > 0 ? existingNumbers.Max() + 1 : 1;
    }

    bool counterNumExists = await db.Counters.AnyAsync(c => c.BranchId == branch.Id && c.CounterNumber == counterNum);
    if (counterNumExists)
    {
        return Results.BadRequest(new { message = $"หมายเลขช่องบริการ {counterNum} มีอยู่ในระบบแล้ว กรุณาใช้หมายเลขอื่น (Counter number {counterNum} already exists)" });
    }

    var counter = new Counter
    {
        BranchId = branch.Id,
        Name = string.IsNullOrWhiteSpace(request.Name) ? $"Counter {counterNum}" : request.Name.Trim(),
        CounterNumber = counterNum,
        AssignedServiceId = request.AssignedServiceId
    };

    db.Counters.Add(counter);
    await db.SaveChangesAsync();

    // Notify all connected clients in this branch
    await notifier.NotifyQueueUpdatedAsync(branch.Id, new { action = "counter_created", counterId = counter.Id, name = counter.Name });

    return Results.Created($"/api/admin/counters/{counter.Id}", counter);
});

app.MapPut("/api/admin/counters/{id:guid}/service", async (
    Guid id,
    [FromBody] UpdateCounterServiceRequest request,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var counter = await db.Counters.Include(c => c.AssignedService).FirstOrDefaultAsync(c => c.Id == id);
    if (counter == null) return Results.NotFound(new { message = "Counter not found." });

    if (request.AssignedServiceId.HasValue)
    {
        var service = await db.Services.FindAsync(request.AssignedServiceId.Value);
        if (service == null) return Results.BadRequest(new { message = "Service not found." });
        counter.AssignedServiceId = service.Id;
    }
    else
    {
        counter.AssignedServiceId = null;
    }

    await db.SaveChangesAsync();

    // Broadcast counter update to branch
    await notifier.NotifyQueueUpdatedAsync(counter.BranchId, new { action = "counter_updated", counterId = counter.Id });

    return Results.Ok(new
    {
        counter.Id,
        counter.Name,
        counter.CounterNumber,
        counter.AssignedServiceId,
        AssignedServiceName = counter.AssignedService?.Name,
        AssignedServicePrefix = counter.AssignedService?.CodePrefix
    });
});

app.MapPut("/api/admin/services/{id:guid}", async (
    Guid id,
    [FromBody] UpdateServiceRequest request,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var service = await db.Services.FindAsync(id);
    if (service == null) return Results.NotFound(new { message = "Service not found." });

    var prefix = request.CodePrefix.Trim().ToUpperInvariant();
    if (string.IsNullOrWhiteSpace(prefix))
    {
        return Results.BadRequest(new { message = "กรุณาระบุรหัสตัวอักษรย่อ เช่น A, B, C (Code prefix is required)" });
    }

    // Check duplicate codePrefix in branch (excluding this service)
    bool prefixExists = await db.Services.AnyAsync(s => s.BranchId == service.BranchId && s.Id != id && s.CodePrefix == prefix);
    if (prefixExists)
    {
        return Results.BadRequest(new { message = $"รหัสตัวอักษรย่อ '{prefix}' มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น (Code prefix '{prefix}' is already in use)" });
    }

    service.Name = request.Name.Trim();
    service.CodePrefix = prefix;
    service.DefaultServiceDurationMinutes = request.DefaultServiceDurationMinutes > 0 ? request.DefaultServiceDurationMinutes : 5;
    if (request.IsActive.HasValue) service.IsActive = request.IsActive.Value;

    await db.SaveChangesAsync();

    await notifier.NotifyQueueUpdatedAsync(service.BranchId, new { action = "service_updated", serviceId = service.Id, name = service.Name });

    return Results.Ok(service);
});

app.MapPatch("/api/admin/services/{id:guid}/toggle-active", async (
    Guid id,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var service = await db.Services.FindAsync(id);
    if (service == null) return Results.NotFound(new { message = "Service not found." });

    service.IsActive = !service.IsActive;
    await db.SaveChangesAsync();

    await notifier.NotifyQueueUpdatedAsync(service.BranchId, new { action = "service_toggled", serviceId = service.Id, isActive = service.IsActive });

    return Results.Ok(new { service.Id, service.IsActive });
});

app.MapDelete("/api/admin/services/{id:guid}", async (
    Guid id,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var service = await db.Services.FindAsync(id);
    if (service == null) return Results.NotFound(new { message = "Service not found." });

    // Unbind counters assigned to this service
    var boundCounters = await db.Counters.Where(c => c.AssignedServiceId == id).ToListAsync();
    foreach (var c in boundCounters)
    {
        c.AssignedServiceId = null;
    }

    // Remove tickets and events associated with this service to avoid foreign key constraints
    var tickets = await db.QueueTickets.Where(t => t.ServiceId == id).ToListAsync();
    if (tickets.Count > 0)
    {
        var ticketIds = tickets.Select(t => t.Id).ToList();
        var events = await db.QueueEvents.Where(e => ticketIds.Contains(e.QueueTicketId)).ToListAsync();
        db.QueueEvents.RemoveRange(events);
        db.QueueTickets.RemoveRange(tickets);
    }

    db.Services.Remove(service);
    await db.SaveChangesAsync();

    await notifier.NotifyQueueUpdatedAsync(service.BranchId, new { action = "service_deleted", serviceId = id, name = service.Name });

    return Results.Ok(new { message = "Service deleted successfully." });
});

app.MapPut("/api/admin/counters/{id:guid}", async (
    Guid id,
    [FromBody] UpdateCounterRequest request,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var counter = await db.Counters.Include(c => c.AssignedService).FirstOrDefaultAsync(c => c.Id == id);
    if (counter == null) return Results.NotFound(new { message = "Counter not found." });

    counter.Name = request.Name.Trim();
    counter.CounterNumber = request.CounterNumber;
    counter.AssignedServiceId = request.AssignedServiceId;
    if (request.IsActive.HasValue) counter.IsActive = request.IsActive.Value;

    await db.SaveChangesAsync();

    await notifier.NotifyQueueUpdatedAsync(counter.BranchId, new { action = "counter_updated", counterId = counter.Id, name = counter.Name });

    return Results.Ok(counter);
});

app.MapPatch("/api/admin/counters/{id:guid}/toggle-active", async (
    Guid id,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var counter = await db.Counters.FindAsync(id);
    if (counter == null) return Results.NotFound(new { message = "Counter not found." });

    counter.IsActive = !counter.IsActive;
    await db.SaveChangesAsync();

    await notifier.NotifyQueueUpdatedAsync(counter.BranchId, new { action = "counter_toggled", counterId = counter.Id, isActive = counter.IsActive });

    return Results.Ok(new { counter.Id, counter.IsActive });
});

app.MapDelete("/api/admin/counters/{id:guid}", async (
    Guid id,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var counter = await db.Counters.FindAsync(id);
    if (counter == null) return Results.NotFound(new { message = "Counter not found." });

    // Unbind counter from any tickets
    var ticketsWithCounter = await db.QueueTickets.Where(t => t.CounterId == id).ToListAsync();
    foreach (var t in ticketsWithCounter)
    {
        t.CounterId = null;
        if (t.Status == QueueStatus.Serving || t.Status == QueueStatus.Called)
        {
            t.Status = QueueStatus.Waiting;
        }
    }

    db.Counters.Remove(counter);
    await db.SaveChangesAsync();

    await notifier.NotifyQueueUpdatedAsync(counter.BranchId, new { action = "counter_deleted", counterId = id, name = counter.Name });

    return Results.Ok(new { message = "Counter deleted successfully." });
});

app.MapPut("/api/admin/branches/{id:guid}", async (
    Guid id,
    [FromBody] UpdateBranchRequest request,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var branch = await db.Branches.FindAsync(id);
    if (branch == null) return Results.NotFound(new { message = "Branch not found." });

    branch.Name = request.Name.Trim();
    branch.Code = request.Code.Trim().ToUpperInvariant();
    branch.Timezone = string.IsNullOrWhiteSpace(request.Timezone) ? "Asia/Bangkok" : request.Timezone.Trim();

    await db.SaveChangesAsync();

    await notifier.NotifyQueueUpdatedAsync(branch.Id, new { action = "branch_updated", branchId = branch.Id, name = branch.Name });

    return Results.Ok(branch);
});

app.MapPost("/api/admin/branches/{id:guid}/reset-queue", async (
    Guid id,
    ApplicationDbContext db,
    ISignalRNotifier notifier) =>
{
    var tickets = await db.QueueTickets.Where(t => t.BranchId == id).ToListAsync();
    if (tickets.Count > 0)
    {
        var ticketIds = tickets.Select(t => t.Id).ToList();
        var events = await db.QueueEvents.Where(e => ticketIds.Contains(e.QueueTicketId)).ToListAsync();
        db.QueueEvents.RemoveRange(events);
        db.QueueTickets.RemoveRange(tickets);
        await db.SaveChangesAsync();
    }

    await notifier.NotifyQueueUpdatedAsync(id, new { action = "queue_reset" });

    return Results.Ok(new { message = "Queue reset successfully back to A01." });
});

app.Run();

// For Integration Test WebApplicationFactory support
public partial class Program { }
