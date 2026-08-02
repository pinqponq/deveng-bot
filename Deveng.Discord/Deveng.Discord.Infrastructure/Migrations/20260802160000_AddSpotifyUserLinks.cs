using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deveng.Discord.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSpotifyUserLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "spotify_user_links",
                columns: table => new
                {
                    discord_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    spotify_user_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    display_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    refresh_token = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    scope = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    product = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    is_premium = table.Column<bool>(type: "boolean", nullable: false),
                    connected_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_spotify_user_links", x => x.discord_user_id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_spotify_user_links_spotify_user_id",
                table: "spotify_user_links",
                column: "spotify_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "spotify_user_links");
        }
    }
}
