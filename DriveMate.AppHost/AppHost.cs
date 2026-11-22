// .NET Aspire AppHost: pressing F5 on this project starts everything DriveMate needs.
var builder = DistributedApplication.CreateBuilder(args);

// The ASP.NET Core API. Ports come from DriveMate.Server/Properties/launchSettings.json
// (https://localhost:7599, http://localhost:5536). Swagger: https://localhost:7599/swagger
var server = builder.AddProject<Projects.DriveMate_Server>("server")
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

// The React + Vite dev server. We pin it to http://localhost:5173 so the URL never changes.
// WithReference(server) passes the API's address to Vite (see the proxy in vite.config.ts),
// and WaitFor(server) delays Vite until the API is healthy.
var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithEndpoint("http", endpoint => endpoint.Port = 5173)
    .WithReference(server)
    .WaitFor(server);

// When publishing, the built React files are copied into the API's wwwroot folder.
server.PublishWithContainerFiles(webfrontend, "wwwroot");

builder.Build().Run();
