using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deveng.Discord.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ApplyPendingSchemaChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "welcome_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "welcome_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "welcome_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "welcome_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "welcome_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "welcome_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "welcome_embed_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_author_icon",
                table: "welcome_dm_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_author_name",
                table: "welcome_dm_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_author_url",
                table: "welcome_dm_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_fields_json",
                table: "welcome_dm_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_footer_icon",
                table: "welcome_dm_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_title_url",
                table: "welcome_dm_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "d_m_embed_use_timestamp",
                table: "welcome_dm_embed_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_author_icon",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_author_name",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_author_url",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_fields_json",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_footer_icon",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "d_m_embed_title_url",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "d_m_embed_use_timestamp",
                table: "welcome",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "welcome",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "welcome",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "ticket_panel",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "welcome_embed_author_icon",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "welcome_embed_author_name",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "welcome_embed_author_url",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "welcome_embed_fields_json",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "welcome_embed_footer_icon",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "welcome_embed_title_url",
                table: "ticket_panel",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "welcome_embed_use_timestamp",
                table: "ticket_panel",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_author_icon",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_author_name",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_author_url",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_fields_json",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_footer_icon",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_title_url",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "create_embed_use_timestamp",
                table: "reminder_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "send_embed_author_icon",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "send_embed_author_name",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "send_embed_author_url",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "send_embed_fields_json",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "send_embed_footer_icon",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "send_embed_title_url",
                table: "reminder_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "send_embed_use_timestamp",
                table: "reminder_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "reminder_embed_setting",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "reminder_embed_setting",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "reminder_embed_setting",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "reminder_embed_setting",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "reminder_embed_setting",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "reminder_embed_setting",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "reminder_embed_setting",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "reminder",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "reminder",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "reminder",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "reminder",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "reminder",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "reminder",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "reminder",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "reaction_role",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "reaction_role",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "reaction_role",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "reaction_role",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "reaction_role",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "reaction_role",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "reaction_role",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "poll_embed_author_icon",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "poll_embed_author_name",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "poll_embed_author_url",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "poll_embed_fields_json",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "poll_embed_footer_icon",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "poll_embed_title_url",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "poll_embed_use_timestamp",
                table: "poll",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "result_embed_author_icon",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "result_embed_author_name",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "result_embed_author_url",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "result_embed_fields_json",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "result_embed_footer_icon",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "result_embed_title_url",
                table: "poll",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "result_embed_use_timestamp",
                table: "poll",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "log_channel_type",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "log_channel_type",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "log_channel_type",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "log_channel_type",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "log_channel_type",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "log_channel_type",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "log_channel_type",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "log_channel_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "log_channel_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "log_channel_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "log_channel_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "log_channel_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "log_channel_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "log_channel_embed_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "notification_embed_author_icon",
                table: "level",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "notification_embed_author_name",
                table: "level",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "notification_embed_author_url",
                table: "level",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "notification_embed_fields_json",
                table: "level",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "notification_embed_footer_icon",
                table: "level",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "notification_embed_title_url",
                table: "level",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "notification_embed_use_timestamp",
                table: "level",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "help_command",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "help_command",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "help_command",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "help_command",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "help_command",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "help_command",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "help_command",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "message",
                table: "help_command",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "guild_embed_template",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "guild_embed_template",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "guild_embed_template",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "guild_embed_template",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "goodbye_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "goodbye_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "goodbye_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "goodbye_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "goodbye_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "goodbye_embed_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "goodbye_embed_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "goodbye",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "goodbye",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "goodbye",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "goodbye",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "goodbye",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "goodbye",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "goodbye",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "giveaway",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "giveaway",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "giveaway",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "giveaway",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "giveaway",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "giveaway",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "giveaway",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "embed_message",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "embed_message",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "embed_message",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "embed_message",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "embed_message",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "embed_message",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "embed_message",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "message",
                table: "embed_message",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_author_icon",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_author_name",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_author_url",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_fields_json",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_footer_icon",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "create_embed_title_url",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "create_embed_use_timestamp",
                table: "birthday_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_icon",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_name",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_author_url",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_fields_json",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_footer_icon",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "embed_title_url",
                table: "birthday_settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "embed_use_timestamp",
                table: "birthday_settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "welcome_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "welcome_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "welcome_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "welcome_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "welcome_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "welcome_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "welcome_embed_settings");

            migrationBuilder.DropColumn(
                name: "d_m_embed_author_icon",
                table: "welcome_dm_embed_settings");

            migrationBuilder.DropColumn(
                name: "d_m_embed_author_name",
                table: "welcome_dm_embed_settings");

            migrationBuilder.DropColumn(
                name: "d_m_embed_author_url",
                table: "welcome_dm_embed_settings");

            migrationBuilder.DropColumn(
                name: "d_m_embed_fields_json",
                table: "welcome_dm_embed_settings");

            migrationBuilder.DropColumn(
                name: "d_m_embed_footer_icon",
                table: "welcome_dm_embed_settings");

            migrationBuilder.DropColumn(
                name: "d_m_embed_title_url",
                table: "welcome_dm_embed_settings");

            migrationBuilder.DropColumn(
                name: "d_m_embed_use_timestamp",
                table: "welcome_dm_embed_settings");

            migrationBuilder.DropColumn(
                name: "d_m_embed_author_icon",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "d_m_embed_author_name",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "d_m_embed_author_url",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "d_m_embed_fields_json",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "d_m_embed_footer_icon",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "d_m_embed_title_url",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "d_m_embed_use_timestamp",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "welcome");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "welcome_embed_author_icon",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "welcome_embed_author_name",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "welcome_embed_author_url",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "welcome_embed_fields_json",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "welcome_embed_footer_icon",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "welcome_embed_title_url",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "welcome_embed_use_timestamp",
                table: "ticket_panel");

            migrationBuilder.DropColumn(
                name: "create_embed_author_icon",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_author_name",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_author_url",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_fields_json",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_footer_icon",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_title_url",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_use_timestamp",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "send_embed_author_icon",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "send_embed_author_name",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "send_embed_author_url",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "send_embed_fields_json",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "send_embed_footer_icon",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "send_embed_title_url",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "send_embed_use_timestamp",
                table: "reminder_settings");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "reminder_embed_setting");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "reminder_embed_setting");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "reminder_embed_setting");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "reminder_embed_setting");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "reminder_embed_setting");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "reminder_embed_setting");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "reminder_embed_setting");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "reminder");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "reminder");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "reminder");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "reminder");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "reminder");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "reminder");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "reminder");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "reaction_role");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "reaction_role");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "reaction_role");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "reaction_role");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "reaction_role");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "reaction_role");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "reaction_role");

            migrationBuilder.DropColumn(
                name: "poll_embed_author_icon",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "poll_embed_author_name",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "poll_embed_author_url",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "poll_embed_fields_json",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "poll_embed_footer_icon",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "poll_embed_title_url",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "poll_embed_use_timestamp",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "result_embed_author_icon",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "result_embed_author_name",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "result_embed_author_url",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "result_embed_fields_json",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "result_embed_footer_icon",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "result_embed_title_url",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "result_embed_use_timestamp",
                table: "poll");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "log_channel_type");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "log_channel_type");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "log_channel_type");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "log_channel_type");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "log_channel_type");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "log_channel_type");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "log_channel_type");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "log_channel_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "log_channel_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "log_channel_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "log_channel_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "log_channel_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "log_channel_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "log_channel_embed_settings");

            migrationBuilder.DropColumn(
                name: "notification_embed_author_icon",
                table: "level");

            migrationBuilder.DropColumn(
                name: "notification_embed_author_name",
                table: "level");

            migrationBuilder.DropColumn(
                name: "notification_embed_author_url",
                table: "level");

            migrationBuilder.DropColumn(
                name: "notification_embed_fields_json",
                table: "level");

            migrationBuilder.DropColumn(
                name: "notification_embed_footer_icon",
                table: "level");

            migrationBuilder.DropColumn(
                name: "notification_embed_title_url",
                table: "level");

            migrationBuilder.DropColumn(
                name: "notification_embed_use_timestamp",
                table: "level");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "help_command");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "help_command");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "help_command");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "help_command");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "help_command");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "help_command");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "help_command");

            migrationBuilder.DropColumn(
                name: "message",
                table: "help_command");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "guild_embed_template");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "guild_embed_template");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "guild_embed_template");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "guild_embed_template");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "goodbye_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "goodbye_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "goodbye_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "goodbye_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "goodbye_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "goodbye_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "goodbye_embed_settings");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "goodbye");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "goodbye");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "goodbye");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "goodbye");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "goodbye");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "goodbye");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "goodbye");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "giveaway");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "giveaway");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "giveaway");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "giveaway");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "giveaway");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "giveaway");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "giveaway");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "embed_message");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "embed_message");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "embed_message");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "embed_message");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "embed_message");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "embed_message");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "embed_message");

            migrationBuilder.DropColumn(
                name: "message",
                table: "embed_message");

            migrationBuilder.DropColumn(
                name: "create_embed_author_icon",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_author_name",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_author_url",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_fields_json",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_footer_icon",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_title_url",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "create_embed_use_timestamp",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "embed_author_icon",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "embed_author_name",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "embed_author_url",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "embed_fields_json",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "embed_footer_icon",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "embed_title_url",
                table: "birthday_settings");

            migrationBuilder.DropColumn(
                name: "embed_use_timestamp",
                table: "birthday_settings");
        }
    }
}
