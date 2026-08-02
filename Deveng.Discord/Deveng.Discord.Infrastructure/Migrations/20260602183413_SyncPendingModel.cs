using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Deveng.Discord.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SyncPendingModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ai_moderation_review",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    queue_id = table.Column<long>(type: "bigint", nullable: false),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    labels_json = table.Column<string>(type: "text", nullable: true),
                    matched_category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    score = table.Column<decimal>(type: "numeric(4,3)", precision: 4, scale: 3, nullable: true),
                    threshold_snapshot_json = table.Column<string>(type: "text", nullable: true),
                    provider = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    model_name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    recommended_action = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    applied_action = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    decision_reason_key = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    decision_reason_params_json = table.Column<string>(type: "text", nullable: true),
                    moderator_decision = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_moderation_review", x => x.id);
                    table.ForeignKey(
                        name: "FK_ai_moderation_review_ai_moderation_queue_queue_id",
                        column: x => x.queue_id,
                        principalTable: "ai_moderation_queue",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_moderation_review_guild_id_created_at_id",
                table: "ai_moderation_review",
                columns: new[] { "guild_id", "created_at", "id" },
                descending: new[] { false, true, true });

            migrationBuilder.CreateIndex(
                name: "IX_ai_moderation_review_queue_id",
                table: "ai_moderation_review",
                column: "queue_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_moderation_review");
        }
    }
}
