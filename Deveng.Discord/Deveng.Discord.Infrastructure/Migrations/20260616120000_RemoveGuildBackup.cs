using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Deveng.Discord.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveGuildBackup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM guild_features WHERE LOWER(feature_name) = 'guildbackup';
                DELETE FROM panel_audit_log
                WHERE resource_type = 'GuildBackupJob'
                   OR action IN ('backup.export', 'backup.import.preview', 'backup.import.apply');
                """);

            migrationBuilder.DropTable(
                name: "guild_backup_job");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "guild_backup_job",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_by_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    mode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    export_version = table.Column<int>(type: "integer", nullable: false),
                    result_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    preview_json = table.Column<string>(type: "text", nullable: true),
                    error = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_backup_job", x => x.id);
                });
        }
    }
}
