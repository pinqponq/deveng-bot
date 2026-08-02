using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deveng.Discord.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DropGuildMusicPriority : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM guild_features WHERE LOWER(feature_name) = 'musicpriority';
                """);

            migrationBuilder.DropTable(
                name: "guild_music_priority");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "guild_music_priority",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    cooldown_seconds = table.Column<int>(type: "integer", nullable: false),
                    max_queue_size = table.Column<int>(type: "integer", nullable: false),
                    max_user_songs = table.Column<int>(type: "integer", nullable: false),
                    priority_tier = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_music_priority", x => x.guild_id);
                });
        }
    }
}
