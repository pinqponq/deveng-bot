using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deveng.Discord.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmbedExtendedFields : Migration
    {
        private static void AddEmbedExtendedColumns(MigrationBuilder migrationBuilder, string table, string prefix)
        {
            migrationBuilder.AddColumn<string>(
                name: $"{prefix}embed_title_url",
                table: table,
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: $"{prefix}embed_author_name",
                table: table,
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: $"{prefix}embed_author_icon",
                table: table,
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: $"{prefix}embed_author_url",
                table: table,
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: $"{prefix}embed_footer_icon",
                table: table,
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: $"{prefix}embed_use_timestamp",
                table: table,
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: $"{prefix}embed_fields_json",
                table: table,
                type: "text",
                nullable: true);
        }

        private static void DropEmbedExtendedColumns(MigrationBuilder migrationBuilder, string table, string prefix)
        {
            migrationBuilder.DropColumn(name: $"{prefix}embed_title_url", table: table);
            migrationBuilder.DropColumn(name: $"{prefix}embed_author_name", table: table);
            migrationBuilder.DropColumn(name: $"{prefix}embed_author_icon", table: table);
            migrationBuilder.DropColumn(name: $"{prefix}embed_author_url", table: table);
            migrationBuilder.DropColumn(name: $"{prefix}embed_footer_icon", table: table);
            migrationBuilder.DropColumn(name: $"{prefix}embed_use_timestamp", table: table);
            migrationBuilder.DropColumn(name: $"{prefix}embed_fields_json", table: table);
        }

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "message",
                table: "embed_message",
                type: "text",
                nullable: true);

            AddEmbedExtendedColumns(migrationBuilder, "embed_message", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "welcome", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "welcome", "dm_");
            AddEmbedExtendedColumns(migrationBuilder, "welcome_embed_settings", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "welcome_dm_embed_settings", "dm_");
            AddEmbedExtendedColumns(migrationBuilder, "goodbye", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "goodbye_embed_settings", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "log_channel_embed_settings", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "log_channel_type", string.Empty);

            migrationBuilder.AddColumn<string>(
                name: "message",
                table: "help_command",
                type: "text",
                nullable: true);

            AddEmbedExtendedColumns(migrationBuilder, "help_command", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "birthday_settings", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "birthday_settings", "create_");
            AddEmbedExtendedColumns(migrationBuilder, "giveaway", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "poll", "poll_");
            AddEmbedExtendedColumns(migrationBuilder, "poll", "result_");
            AddEmbedExtendedColumns(migrationBuilder, "ticket_panel", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "ticket_panel", "welcome_");
            AddEmbedExtendedColumns(migrationBuilder, "reaction_role", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "reminder", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "reminder_settings", "create_");
            AddEmbedExtendedColumns(migrationBuilder, "reminder_settings", "send_");
            AddEmbedExtendedColumns(migrationBuilder, "reminder_embed_setting", string.Empty);
            AddEmbedExtendedColumns(migrationBuilder, "level", "notification_");
            AddEmbedExtendedColumns(migrationBuilder, "guild_embed_template", string.Empty);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            DropEmbedExtendedColumns(migrationBuilder, "guild_embed_template", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "level", "notification_");
            DropEmbedExtendedColumns(migrationBuilder, "reminder_embed_setting", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "reminder_settings", "send_");
            DropEmbedExtendedColumns(migrationBuilder, "reminder_settings", "create_");
            DropEmbedExtendedColumns(migrationBuilder, "reminder", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "reaction_role", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "ticket_panel", "welcome_");
            DropEmbedExtendedColumns(migrationBuilder, "ticket_panel", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "poll", "result_");
            DropEmbedExtendedColumns(migrationBuilder, "poll", "poll_");
            DropEmbedExtendedColumns(migrationBuilder, "giveaway", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "birthday_settings", "create_");
            DropEmbedExtendedColumns(migrationBuilder, "birthday_settings", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "help_command", string.Empty);
            migrationBuilder.DropColumn(name: "message", table: "help_command");
            DropEmbedExtendedColumns(migrationBuilder, "log_channel_type", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "log_channel_embed_settings", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "goodbye_embed_settings", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "goodbye", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "welcome_dm_embed_settings", "dm_");
            DropEmbedExtendedColumns(migrationBuilder, "welcome_embed_settings", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "welcome", "dm_");
            DropEmbedExtendedColumns(migrationBuilder, "welcome", string.Empty);
            DropEmbedExtendedColumns(migrationBuilder, "embed_message", string.Empty);
            migrationBuilder.DropColumn(name: "message", table: "embed_message");
        }
    }
}
