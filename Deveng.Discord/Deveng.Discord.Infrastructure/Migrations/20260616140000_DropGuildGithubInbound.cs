using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deveng.Discord.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DropGuildGithubInbound : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM guild_features WHERE LOWER(feature_name) = 'githubwebhook';
                """);

            migrationBuilder.DropTable(
                name: "guild_github_inbound");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "guild_github_inbound",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    inbound_token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    webhook_secret = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    last_delivery_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_github_inbound", x => x.guild_id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_guild_github_inbound_inbound_token",
                table: "guild_github_inbound",
                column: "inbound_token",
                unique: true);
        }
    }
}
