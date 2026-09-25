# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY QueueFlow.Domain/QueueFlow.Domain.csproj QueueFlow.Domain/
COPY QueueFlow.Application/QueueFlow.Application.csproj QueueFlow.Application/
COPY QueueFlow.Infrastructure/QueueFlow.Infrastructure.csproj QueueFlow.Infrastructure/
COPY QueueFlow.Api/QueueFlow.Api.csproj QueueFlow.Api/
RUN dotnet restore QueueFlow.Api/QueueFlow.Api.csproj

COPY . .
WORKDIR /src/QueueFlow.Api
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "QueueFlow.Api.dll"]
