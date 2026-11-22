# DriveMate API (ASP.NET Core). Built and run on Render; the React website is hosted on Vercel.
# Build context is the repository root.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
# Copy the project file first so package restore is cached until packages change.
COPY DriveMate.Server/DriveMate.Server.csproj DriveMate.Server/
RUN dotnet restore DriveMate.Server/DriveMate.Server.csproj
COPY DriveMate.Server/ DriveMate.Server/
RUN dotnet publish DriveMate.Server/DriveMate.Server.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .
# Database and uploaded photos live here. On Render's free plan this folder resets on each deploy/restart;
# attach a persistent disk mounted at /app/App_Data to keep them.
RUN mkdir -p /app/App_Data && chown -R $APP_UID /app/App_Data
USER $APP_UID
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "DriveMate.Server.dll"]
