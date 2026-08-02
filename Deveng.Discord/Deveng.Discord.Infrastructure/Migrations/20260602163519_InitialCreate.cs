using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Deveng.Discord.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ai_moderation_capacity_usage",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    period_key = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    enqueued_count = table.Column<int>(type: "integer", nullable: false),
                    processed_count = table.Column<int>(type: "integer", nullable: false),
                    failed_count = table.Column<int>(type: "integer", nullable: false),
                    last_updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_moderation_capacity_usage", x => new { x.guild_id, x.period_key });
                });

            migrationBuilder.CreateTable(
                name: "ai_moderation_queue",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    user_id_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    content_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    content_preview_redacted = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    next_attempt_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    processed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    error_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_moderation_queue", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "ai_moderation_setting",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    mode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    threshold_log = table.Column<decimal>(type: "numeric(4,3)", precision: 4, scale: 3, nullable: false),
                    threshold_delete = table.Column<decimal>(type: "numeric(4,3)", precision: 4, scale: 3, nullable: false),
                    threshold_timeout = table.Column<decimal>(type: "numeric(4,3)", precision: 4, scale: 3, nullable: false),
                    retention_days = table.Column<int>(type: "integer", nullable: false),
                    sample_rate = table.Column<decimal>(type: "numeric(4,3)", precision: 4, scale: 3, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_moderation_setting", x => x.guild_id);
                });

            migrationBuilder.CreateTable(
                name: "application_form",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false),
                    fields_json = table.Column<string>(type: "text", nullable: false),
                    submit_channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    review_channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    approval_role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_application_form", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "birthday_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    message = table.Column<string>(type: "text", nullable: true),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_description = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    check_hour = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    create_message_is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    create_message = table.Column<string>(type: "text", nullable: true),
                    create_embed_title = table.Column<string>(type: "text", nullable: true),
                    create_embed_description = table.Column<string>(type: "text", nullable: true),
                    create_embed_color = table.Column<string>(type: "text", nullable: true),
                    create_embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    create_embed_image = table.Column<string>(type: "text", nullable: true),
                    create_embed_footer = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_birthday_settings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "birthday_user",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    birth_date = table.Column<DateOnly>(type: "date", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    last_celebrated_year = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_birthday_user", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "custom_bots",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    bot_token = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    client_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    owner_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    bot_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_seen = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_custom_bots", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "custom_command",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    command_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    action_type = table.Column<int>(type: "integer", nullable: false),
                    target_channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    message = table.Column<string>(type: "text", nullable: true),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    cooldown_type = table.Column<int>(type: "integer", nullable: false),
                    cooldown_seconds = table.Column<int>(type: "integer", nullable: true),
                    send_d_m = table.Column<bool>(type: "boolean", nullable: false),
                    delete_command = table.Column<bool>(type: "boolean", nullable: false),
                    no_reply = table.Column<bool>(type: "boolean", nullable: false),
                    use_regex = table.Column<bool>(type: "boolean", nullable: false),
                    trigger_pattern = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    scope = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_custom_command", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "embed_message",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_description = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_embed_message", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "feed_subscription",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    external_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    target_channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    mention_role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    poll_interval_seconds = table.Column<int>(type: "integer", nullable: false),
                    last_etag = table.Column<string>(type: "text", nullable: true),
                    last_modified = table.Column<string>(type: "text", nullable: true),
                    last_item_id = table.Column<string>(type: "text", nullable: true),
                    error_count = table.Column<int>(type: "integer", nullable: false),
                    last_success_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_error_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feed_subscription", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "giveaway",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    prize = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    winner_count = table.Column<int>(type: "integer", nullable: false),
                    end_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    time_zone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    is_ended = table.Column<bool>(type: "boolean", nullable: false),
                    role_permission_type = table.Column<int>(type: "integer", nullable: false),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_description = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_giveaway", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "goodbye",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    language = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_goodbye", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "guild_auto_role_setting",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    delay_seconds = table.Column<int>(type: "integer", nullable: false),
                    min_account_age_days = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_auto_role_setting", x => x.guild_id);
                });

            migrationBuilder.CreateTable(
                name: "guild_automation",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    definition_json = table.Column<string>(type: "text", nullable: false),
                    retry_on_failure = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_automation", x => x.id);
                });

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

            migrationBuilder.CreateTable(
                name: "guild_embed_template",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    kind = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    parent_entity_id = table.Column<int>(type: "integer", nullable: true),
                    slot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    message = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    embed_title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    embed_description = table.Column<string>(type: "character varying(4096)", maxLength: 4096, nullable: true),
                    embed_color = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    embed_thumbnail = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    embed_image = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    embed_footer = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    embed_author_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    embed_author_icon = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    embed_author_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_embed_template", x => x.id);
                });

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

            migrationBuilder.CreateTable(
                name: "guild_invite_contribution",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    joined_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    inviter_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    invite_code = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    joined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    source_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_invite_contribution", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "guild_invite_snapshot",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    invite_code = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    inviter_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    uses = table.Column<int>(type: "integer", nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_seen_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_invite_snapshot", x => new { x.guild_id, x.invite_code });
                });

            migrationBuilder.CreateTable(
                name: "guild_invite_stats",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    period_key = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    count = table.Column<int>(type: "integer", nullable: false),
                    last_contributed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_invite_stats", x => new { x.guild_id, x.user_id, x.period_key });
                });

            migrationBuilder.CreateTable(
                name: "guild_locale_setting",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    default_locale = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    fallback_locale = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_locale_setting", x => x.guild_id);
                });

            migrationBuilder.CreateTable(
                name: "guild_member_event",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    event_type = table.Column<byte>(type: "smallint", nullable: false),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    metadata_json = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_member_event", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "guild_music_priority",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    priority_tier = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    max_queue_size = table.Column<int>(type: "integer", nullable: false),
                    max_user_songs = table.Column<int>(type: "integer", nullable: false),
                    cooldown_seconds = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_music_priority", x => x.guild_id);
                });

            migrationBuilder.CreateTable(
                name: "guild_report_job",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_by_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    report_range = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    status = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    summary_json = table.Column<string>(type: "text", nullable: true),
                    file_ref = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    error = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    email_to = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    email_sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    email_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    email_error = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_report_job", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "guild_report_notify",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    notify_email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    send_on_complete = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_report_notify", x => x.guild_id);
                });

            migrationBuilder.CreateTable(
                name: "guild_user_activity_day",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    activity_date = table.Column<DateOnly>(type: "date", nullable: false),
                    message_count = table.Column<int>(type: "integer", nullable: false),
                    voice_seconds = table.Column<int>(type: "integer", nullable: false),
                    reaction_count = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_user_activity_day", x => new { x.guild_id, x.user_id, x.activity_date });
                });

            migrationBuilder.CreateTable(
                name: "guilds",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    guild_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    owner_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    member_count = table.Column<int>(type: "integer", nullable: false),
                    joined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_seen = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guilds", x => x.id);
                    table.UniqueConstraint("AK_guilds_guild_id", x => x.guild_id);
                });

            migrationBuilder.CreateTable(
                name: "help_command",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    command_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    cooldown_type = table.Column<int>(type: "integer", nullable: false),
                    cooldown_seconds = table.Column<int>(type: "integer", nullable: true),
                    send_as_d_m = table.Column<bool>(type: "boolean", nullable: false),
                    delete_after_use = table.Column<bool>(type: "boolean", nullable: false),
                    disable_reply = table.Column<bool>(type: "boolean", nullable: false),
                    role_permission_type = table.Column<int>(type: "integer", nullable: false),
                    channel_permission_type = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_description = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_help_command", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "level",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    xp_per_message = table.Column<int>(type: "integer", nullable: false),
                    xp_per_message_min = table.Column<int>(type: "integer", nullable: false),
                    xp_per_message_max = table.Column<int>(type: "integer", nullable: false),
                    use_random_xp = table.Column<bool>(type: "boolean", nullable: false),
                    cooldown_seconds = table.Column<int>(type: "integer", nullable: false),
                    base_xp_required = table.Column<int>(type: "integer", nullable: false),
                    xp_multiplier = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false),
                    notify_on_level_up = table.Column<bool>(type: "boolean", nullable: false),
                    notification_channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    use_embed_for_notification = table.Column<bool>(type: "boolean", nullable: false),
                    notification_message = table.Column<string>(type: "text", nullable: true),
                    enable_role_rewards = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    notification_embed_title = table.Column<string>(type: "text", nullable: true),
                    notification_embed_description = table.Column<string>(type: "text", nullable: true),
                    notification_embed_color = table.Column<string>(type: "text", nullable: true),
                    notification_embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    notification_embed_image = table.Column<string>(type: "text", nullable: true),
                    notification_embed_footer = table.Column<string>(type: "text", nullable: true),
                    use_embed_for_xp_gain = table.Column<bool>(type: "boolean", nullable: false),
                    xp_gain_message = table.Column<string>(type: "text", nullable: true),
                    xp_gain_embed_color = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_level", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "level_ignored_channel",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_level_ignored_channel", x => new { x.guild_id, x.channel_id });
                });

            migrationBuilder.CreateTable(
                name: "level_ignored_role",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_level_ignored_role", x => new { x.guild_id, x.role_id });
                });

            migrationBuilder.CreateTable(
                name: "level_role_reward",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    level = table.Column<int>(type: "integer", nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    remove_previous_role = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_level_role_reward", x => new { x.guild_id, x.level, x.role_id });
                });

            migrationBuilder.CreateTable(
                name: "log_channel",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_log_channel", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "moderation_action_log",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    rule_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    user_id_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    action = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    action_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    reason_key = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    reason_params_json = table.Column<string>(type: "text", nullable: true),
                    score_snapshot_json = table.Column<string>(type: "text", nullable: true),
                    actor_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    actor_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    review_id = table.Column<long>(type: "bigint", nullable: true),
                    error_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_moderation_action_log", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "moderator",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_moderator", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "music_favorites",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    track_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    encoded_track = table.Column<string>(type: "text", nullable: true),
                    title = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    author = table.Column<string>(type: "text", nullable: true),
                    duration_ms = table.Column<long>(type: "bigint", nullable: true),
                    uri = table.Column<string>(type: "text", nullable: true),
                    source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    thumbnail_url = table.Column<string>(type: "text", nullable: true),
                    album = table.Column<string>(type: "text", nullable: true),
                    artists = table.Column<string>(type: "text", nullable: true),
                    external_provider = table.Column<string>(type: "text", nullable: true),
                    spotify_track_id = table.Column<string>(type: "text", nullable: true),
                    spotify_artist_id = table.Column<string>(type: "text", nullable: true),
                    spotify_album_id = table.Column<string>(type: "text", nullable: true),
                    spotify_url = table.Column<string>(type: "text", nullable: true),
                    popularity = table.Column<int>(type: "integer", nullable: true),
                    genres = table.Column<string>(type: "text", nullable: true),
                    release_date = table.Column<string>(type: "text", nullable: true),
                    album_image_url = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_favorites", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "music_lyrics_cache",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    track_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    title = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    author = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    provider = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    lyrics = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_lyrics_cache", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "music_playlists",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    owner_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    scope = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    import_source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    cover_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    external_provider = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    external_playlist_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    external_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    total_tracks = table.Column<int>(type: "integer", nullable: false),
                    imported_tracks = table.Column<int>(type: "integer", nullable: false),
                    failed_tracks = table.Column<int>(type: "integer", nullable: false),
                    last_import_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    last_import_error = table.Column<string>(type: "text", nullable: true),
                    last_imported_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_autoplay_source = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_playlists", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "music_radio_stations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    stream_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    country = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    genre = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    image_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_radio_stations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "music_sessions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    cover_track_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    cover_title = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    cover_thumbnail_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    track_count = table.Column<int>(type: "integer", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_sessions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "music_settings",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    default_volume = table.Column<int>(type: "integer", nullable: false),
                    max_queue_size = table.Column<int>(type: "integer", nullable: false),
                    dj_role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    allow_everyone_to_play = table.Column<bool>(type: "boolean", nullable: false),
                    allowed_text_channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    auto_leave_seconds = table.Column<int>(type: "integer", nullable: false),
                    announce_now_playing = table.Column<bool>(type: "boolean", nullable: false),
                    mode247 = table.Column<bool>(type: "boolean", nullable: false),
                    autoplay = table.Column<bool>(type: "boolean", nullable: false),
                    prevent_duplicates = table.Column<bool>(type: "boolean", nullable: false),
                    dj_only = table.Column<bool>(type: "boolean", nullable: false),
                    dj_playlists = table.Column<bool>(type: "boolean", nullable: false),
                    max_user_songs = table.Column<int>(type: "integer", nullable: false),
                    require_dj_role = table.Column<bool>(type: "boolean", nullable: false),
                    setup_completed = table.Column<bool>(type: "boolean", nullable: false),
                    playlist_limit = table.Column<int>(type: "integer", nullable: false),
                    playlist_track_limit = table.Column<int>(type: "integer", nullable: false),
                    favorite_limit = table.Column<int>(type: "integer", nullable: false),
                    import_track_limit = table.Column<int>(type: "integer", nullable: false),
                    radio_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    crossfade_seconds = table.Column<int>(type: "integer", nullable: false),
                    quality = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    bassboost = table.Column<bool>(type: "boolean", nullable: false),
                    nightcore = table.Column<bool>(type: "boolean", nullable: false),
                    slowed = table.Column<bool>(type: "boolean", nullable: false),
                    speed = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_settings", x => x.guild_id);
                });

            migrationBuilder.CreateTable(
                name: "panel_audit_log",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    actor_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    actor_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    actor_username_snapshot = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    actor_avatar_snapshot = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    actor_roles_snapshot_json = table.Column<string>(type: "text", nullable: true),
                    action = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    resource_type = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    resource_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    before_json = table.Column<string>(type: "text", nullable: true),
                    after_json = table.Column<string>(type: "text", nullable: true),
                    changed_fields_json = table.Column<string>(type: "text", nullable: true),
                    request_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    ip_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    user_agent_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    result = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    error_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_panel_audit_log", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "poll",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    question = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    end_after_minutes = table.Column<int>(type: "integer", nullable: true),
                    end_after_votes = table.Column<int>(type: "integer", nullable: true),
                    allow_multiple_votes = table.Column<bool>(type: "boolean", nullable: false),
                    total_votes = table.Column<int>(type: "integer", nullable: false),
                    poll_embed_title = table.Column<string>(type: "text", nullable: true),
                    poll_embed_description = table.Column<string>(type: "text", nullable: true),
                    poll_embed_color = table.Column<string>(type: "text", nullable: true),
                    poll_embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    poll_embed_image = table.Column<string>(type: "text", nullable: true),
                    poll_embed_footer = table.Column<string>(type: "text", nullable: true),
                    result_embed_title = table.Column<string>(type: "text", nullable: true),
                    result_embed_description = table.Column<string>(type: "text", nullable: true),
                    result_embed_color = table.Column<string>(type: "text", nullable: true),
                    result_embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    result_embed_image = table.Column<string>(type: "text", nullable: true),
                    result_embed_footer = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_via = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_poll", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "reaction_role",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    normal_message = table.Column<string>(type: "text", nullable: true),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_description = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    enable_emoji = table.Column<bool>(type: "boolean", nullable: false),
                    enable_button = table.Column<bool>(type: "boolean", nullable: false),
                    enable_menu = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reaction_role", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "reminder",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    remind_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    message = table.Column<string>(type: "text", nullable: true),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_description = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    is_sent = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reminder", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "reminder_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    create_message_is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    create_message = table.Column<string>(type: "text", nullable: true),
                    create_embed_title = table.Column<string>(type: "text", nullable: true),
                    create_embed_description = table.Column<string>(type: "text", nullable: true),
                    create_embed_color = table.Column<string>(type: "text", nullable: true),
                    create_embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    create_embed_image = table.Column<string>(type: "text", nullable: true),
                    create_embed_footer = table.Column<string>(type: "text", nullable: true),
                    default_is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    send_message_is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    send_message = table.Column<string>(type: "text", nullable: true),
                    send_embed_title = table.Column<string>(type: "text", nullable: true),
                    send_embed_description = table.Column<string>(type: "text", nullable: true),
                    send_embed_color = table.Column<string>(type: "text", nullable: true),
                    send_embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    send_embed_image = table.Column<string>(type: "text", nullable: true),
                    send_embed_footer = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reminder_settings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "scheduled_announcement",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    title = table.Column<string>(type: "text", nullable: true),
                    content = table.Column<string>(type: "text", nullable: true),
                    embed_json = table.Column<string>(type: "text", nullable: true),
                    mention_policy = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    timezone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    schedule_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    send_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    r_rule_json = table.Column<string>(type: "text", nullable: true),
                    next_run_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_run_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    paused = table.Column<bool>(type: "boolean", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_by_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scheduled_announcement", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "statistics_channel",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    counter_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    peak_online_count = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_statistics_channel", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "temporary_voice_channel_lobby",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    user_limit = table.Column<int>(type: "integer", nullable: true),
                    bitrate = table.Column<int>(type: "integer", nullable: true),
                    delete_after_minutes = table.Column<int>(type: "integer", nullable: true),
                    ownership_timeout_minutes = table.Column<int>(type: "integer", nullable: true),
                    sync_category_permissions = table.Column<bool>(type: "boolean", nullable: false),
                    sync_channel_permissions = table.Column<bool>(type: "boolean", nullable: false),
                    create_text_channel = table.Column<bool>(type: "boolean", nullable: false),
                    restrict_commands_to_text_channel = table.Column<bool>(type: "boolean", nullable: false),
                    pin_command_usage = table.Column<bool>(type: "boolean", nullable: false),
                    restrict_text_channel = table.Column<bool>(type: "boolean", nullable: false),
                    owner_can_manage_channel = table.Column<bool>(type: "boolean", nullable: false),
                    owner_can_manage_permissions = table.Column<bool>(type: "boolean", nullable: false),
                    owner_is_priority_speaker = table.Column<bool>(type: "boolean", nullable: false),
                    owner_can_move_members = table.Column<bool>(type: "boolean", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    owner_can_stream = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_temporary_voice_channel_lobby", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "ticket_panel",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    panel_message = table.Column<string>(type: "text", nullable: true),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_description = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    welcome_message = table.Column<string>(type: "text", nullable: true),
                    is_welcome_embed = table.Column<bool>(type: "boolean", nullable: false),
                    welcome_embed_title = table.Column<string>(type: "text", nullable: true),
                    welcome_embed_description = table.Column<string>(type: "text", nullable: true),
                    welcome_embed_color = table.Column<string>(type: "text", nullable: true),
                    welcome_embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    welcome_embed_image = table.Column<string>(type: "text", nullable: true),
                    welcome_embed_footer = table.Column<string>(type: "text", nullable: true),
                    transcript_channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    send_transcript_to_user = table.Column<bool>(type: "boolean", nullable: false),
                    open_category_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    open_category_name = table.Column<string>(type: "text", nullable: true),
                    claimed_category_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    claimed_category_name = table.Column<string>(type: "text", nullable: true),
                    closed_category_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    closed_category_name = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_panel", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "user_level",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    level = table.Column<int>(type: "integer", nullable: false),
                    total_xp = table.Column<long>(type: "bigint", nullable: false),
                    current_xp = table.Column<long>(type: "bigint", nullable: false),
                    xp_for_next_level = table.Column<long>(type: "bigint", nullable: false),
                    last_message_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_level", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "welcome",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    language = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    send_welcome_card = table.Column<bool>(type: "boolean", nullable: false),
                    card_title = table.Column<string>(type: "text", nullable: true),
                    card_username_text = table.Column<string>(type: "text", nullable: true),
                    card_member_text = table.Column<string>(type: "text", nullable: true),
                    card_background_color1 = table.Column<string>(type: "text", nullable: true),
                    card_background_color2 = table.Column<string>(type: "text", nullable: true),
                    card_text_color = table.Column<string>(type: "text", nullable: true),
                    card_border_color = table.Column<string>(type: "text", nullable: true),
                    send_d_m = table.Column<bool>(type: "boolean", nullable: false),
                    d_m_message = table.Column<string>(type: "text", nullable: true),
                    is_d_m_embed = table.Column<bool>(type: "boolean", nullable: false),
                    d_m_embed_title = table.Column<string>(type: "text", nullable: true),
                    d_m_embed_color = table.Column<string>(type: "text", nullable: true),
                    d_m_embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    d_m_embed_image = table.Column<string>(type: "text", nullable: true),
                    d_m_embed_footer = table.Column<string>(type: "text", nullable: true),
                    send_d_m_card = table.Column<bool>(type: "boolean", nullable: false),
                    d_m_card_title = table.Column<string>(type: "text", nullable: true),
                    d_m_card_username_text = table.Column<string>(type: "text", nullable: true),
                    d_m_card_member_text = table.Column<string>(type: "text", nullable: true),
                    d_m_card_background_color1 = table.Column<string>(type: "text", nullable: true),
                    d_m_card_background_color2 = table.Column<string>(type: "text", nullable: true),
                    d_m_card_text_color = table.Column<string>(type: "text", nullable: true),
                    d_m_card_border_color = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    give_role = table.Column<bool>(type: "boolean", nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_welcome", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "ai_moderation_excluded_channel",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_moderation_excluded_channel", x => new { x.guild_id, x.channel_id });
                    table.ForeignKey(
                        name: "FK_ai_moderation_excluded_channel_ai_moderation_setting_guild_~",
                        column: x => x.guild_id,
                        principalTable: "ai_moderation_setting",
                        principalColumn: "guild_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_moderation_policy",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    log_threshold = table.Column<decimal>(type: "numeric(4,3)", precision: 4, scale: 3, nullable: false),
                    delete_threshold = table.Column<decimal>(type: "numeric(4,3)", precision: 4, scale: 3, nullable: false),
                    timeout_threshold = table.Column<decimal>(type: "numeric(4,3)", precision: 4, scale: 3, nullable: false),
                    action = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    a_i_moderation_setting_guild_id = table.Column<string>(type: "character varying(32)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_moderation_policy", x => x.id);
                    table.ForeignKey(
                        name: "FK_ai_moderation_policy_ai_moderation_setting_a_i_moderation_s~",
                        column: x => x.a_i_moderation_setting_guild_id,
                        principalTable: "ai_moderation_setting",
                        principalColumn: "guild_id");
                });

            migrationBuilder.CreateTable(
                name: "application_response",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    form_id = table.Column<long>(type: "bigint", nullable: false),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    form_version = table.Column<int>(type: "integer", nullable: false),
                    answers_json = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    assignee_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    reviewer_notes = table.Column<string>(type: "text", nullable: true),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    decided_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_application_response", x => x.id);
                    table.ForeignKey(
                        name: "FK_application_response_application_form_form_id",
                        column: x => x.form_id,
                        principalTable: "application_form",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "guild_custom_command_usage",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    command_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    last_used_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_custom_command_usage", x => new { x.guild_id, x.command_id, x.user_id });
                    table.ForeignKey(
                        name: "FK_guild_custom_command_usage_custom_command_command_id",
                        column: x => x.command_id,
                        principalTable: "custom_command",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "feed_item_delivery",
                columns: table => new
                {
                    subscription_id = table.Column<long>(type: "bigint", nullable: false),
                    item_id = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    item_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    delivered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feed_item_delivery", x => new { x.subscription_id, x.item_id });
                    table.ForeignKey(
                        name: "FK_feed_item_delivery_feed_subscription_subscription_id",
                        column: x => x.subscription_id,
                        principalTable: "feed_subscription",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "giveaway_allowed_role",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    giveaway_id = table.Column<int>(type: "integer", nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_giveaway_allowed_role", x => x.id);
                    table.ForeignKey(
                        name: "FK_giveaway_allowed_role_giveaway_giveaway_id",
                        column: x => x.giveaway_id,
                        principalTable: "giveaway",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "giveaway_participant",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    giveaway_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    joined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_giveaway_participant", x => x.id);
                    table.ForeignKey(
                        name: "FK_giveaway_participant_giveaway_giveaway_id",
                        column: x => x.giveaway_id,
                        principalTable: "giveaway",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "giveaway_role",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    giveaway_id = table.Column<int>(type: "integer", nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    win_chance_multiplier = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_giveaway_role", x => x.id);
                    table.ForeignKey(
                        name: "FK_giveaway_role_giveaway_giveaway_id",
                        column: x => x.giveaway_id,
                        principalTable: "giveaway",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "giveaway_winner",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    giveaway_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    won_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_giveaway_winner", x => x.id);
                    table.ForeignKey(
                        name: "FK_giveaway_winner_giveaway_giveaway_id",
                        column: x => x.giveaway_id,
                        principalTable: "giveaway",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "goodbye_embed_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    goodbye_id = table.Column<int>(type: "integer", nullable: false),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_goodbye_embed_settings", x => x.id);
                    table.ForeignKey(
                        name: "FK_goodbye_embed_settings_goodbye_goodbye_id",
                        column: x => x.goodbye_id,
                        principalTable: "goodbye",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "guild_auto_role_audit",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    result = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    error_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_auto_role_audit", x => x.id);
                    table.ForeignKey(
                        name: "FK_guild_auto_role_audit_guild_auto_role_setting_guild_id",
                        column: x => x.guild_id,
                        principalTable: "guild_auto_role_setting",
                        principalColumn: "guild_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "guild_auto_role_role",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_auto_role_role", x => x.id);
                    table.ForeignKey(
                        name: "FK_guild_auto_role_role_guild_auto_role_setting_guild_id",
                        column: x => x.guild_id,
                        principalTable: "guild_auto_role_setting",
                        principalColumn: "guild_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "guild_features",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    feature_name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guild_features", x => x.id);
                    table.ForeignKey(
                        name: "FK_guild_features_guilds_guild_id",
                        column: x => x.guild_id,
                        principalTable: "guilds",
                        principalColumn: "guild_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "help_command_channel",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    help_command_id = table.Column<int>(type: "integer", nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_help_command_channel", x => x.id);
                    table.ForeignKey(
                        name: "FK_help_command_channel_help_command_help_command_id",
                        column: x => x.help_command_id,
                        principalTable: "help_command",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "help_command_role",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    help_command_id = table.Column<int>(type: "integer", nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_help_command_role", x => x.id);
                    table.ForeignKey(
                        name: "FK_help_command_role_help_command_help_command_id",
                        column: x => x.help_command_id,
                        principalTable: "help_command",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "log_channel_embed_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    log_channel_id = table.Column<int>(type: "integer", nullable: false),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    embed_description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_log_channel_embed_settings", x => x.id);
                    table.ForeignKey(
                        name: "FK_log_channel_embed_settings_log_channel_log_channel_id",
                        column: x => x.log_channel_id,
                        principalTable: "log_channel",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "log_channel_type",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    log_channel_id = table.Column<int>(type: "integer", nullable: false),
                    log_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    embed_description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_log_channel_type", x => x.id);
                    table.ForeignKey(
                        name: "FK_log_channel_type_log_channel_log_channel_id",
                        column: x => x.log_channel_id,
                        principalTable: "log_channel",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "moderation_user_notice",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    action_log_id = table.Column<long>(type: "bigint", nullable: false),
                    notice_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    notice_text_key = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    notice_params_json = table.Column<string>(type: "text", nullable: true),
                    delivery_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    discord_notice_message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_moderation_user_notice", x => x.id);
                    table.ForeignKey(
                        name: "FK_moderation_user_notice_moderation_action_log_action_log_id",
                        column: x => x.action_log_id,
                        principalTable: "moderation_action_log",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "forbidden_word",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    moderator_id = table.Column<int>(type: "integer", nullable: false),
                    word = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_forbidden_word", x => x.id);
                    table.ForeignKey(
                        name: "FK_forbidden_word_moderator_moderator_id",
                        column: x => x.moderator_id,
                        principalTable: "moderator",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "moderator_rule",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    moderator_id = table.Column<int>(type: "integer", nullable: false),
                    rule_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    action = table.Column<int>(type: "integer", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_moderator_rule", x => x.id);
                    table.ForeignKey(
                        name: "FK_moderator_rule_moderator_moderator_id",
                        column: x => x.moderator_id,
                        principalTable: "moderator",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "music_playlist_import_jobs",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    playlist_id = table.Column<int>(type: "integer", nullable: true),
                    provider = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    source_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    total_tracks = table.Column<int>(type: "integer", nullable: false),
                    processed_tracks = table.Column<int>(type: "integer", nullable: false),
                    imported_tracks = table.Column<int>(type: "integer", nullable: false),
                    failed_tracks = table.Column<int>(type: "integer", nullable: false),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_playlist_import_jobs", x => x.id);
                    table.ForeignKey(
                        name: "FK_music_playlist_import_jobs_music_playlists_playlist_id",
                        column: x => x.playlist_id,
                        principalTable: "music_playlists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "music_playlist_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    playlist_id = table.Column<int>(type: "integer", nullable: false),
                    track_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    encoded_track = table.Column<string>(type: "text", nullable: true),
                    title = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    author = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    duration_ms = table.Column<long>(type: "bigint", nullable: true),
                    uri = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    thumbnail_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    album = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    artists = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    external_provider = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    external_track_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    spotify_track_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    spotify_artist_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    spotify_album_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    spotify_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    popularity = table.Column<int>(type: "integer", nullable: true),
                    genres = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    release_date = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    album_image_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    import_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    import_error = table.Column<string>(type: "text", nullable: true),
                    added_by_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    position = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_playlist_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_music_playlist_items_music_playlists_playlist_id",
                        column: x => x.playlist_id,
                        principalTable: "music_playlists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "music_history",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    track_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    encoded_track = table.Column<string>(type: "text", nullable: true),
                    title = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    author = table.Column<string>(type: "text", nullable: true),
                    duration_ms = table.Column<long>(type: "bigint", nullable: true),
                    uri = table.Column<string>(type: "text", nullable: true),
                    source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    thumbnail_url = table.Column<string>(type: "text", nullable: true),
                    album = table.Column<string>(type: "text", nullable: true),
                    artists = table.Column<string>(type: "text", nullable: true),
                    session_id = table.Column<long>(type: "bigint", nullable: true),
                    external_provider = table.Column<string>(type: "text", nullable: true),
                    spotify_track_id = table.Column<string>(type: "text", nullable: true),
                    spotify_artist_id = table.Column<string>(type: "text", nullable: true),
                    spotify_album_id = table.Column<string>(type: "text", nullable: true),
                    spotify_url = table.Column<string>(type: "text", nullable: true),
                    popularity = table.Column<int>(type: "integer", nullable: true),
                    genres = table.Column<string>(type: "text", nullable: true),
                    release_date = table.Column<string>(type: "text", nullable: true),
                    album_image_url = table.Column<string>(type: "text", nullable: true),
                    requester_username = table.Column<string>(type: "text", nullable: true),
                    voice_channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    text_channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    position_ms = table.Column<long>(type: "bigint", nullable: true),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    end_reason = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_music_history_music_sessions_session_id",
                        column: x => x.session_id,
                        principalTable: "music_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "music_session_participants",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    session_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    username = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    avatar_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_session_participants", x => x.id);
                    table.ForeignKey(
                        name: "FK_music_session_participants_music_sessions_session_id",
                        column: x => x.session_id,
                        principalTable: "music_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "music_blacklisted_text_channel",
                columns: table => new
                {
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_music_blacklisted_text_channel", x => new { x.guild_id, x.channel_id });
                    table.ForeignKey(
                        name: "FK_music_blacklisted_text_channel_music_settings_guild_id",
                        column: x => x.guild_id,
                        principalTable: "music_settings",
                        principalColumn: "guild_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "poll_option",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    poll_id = table.Column<int>(type: "integer", nullable: false),
                    option_text = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    emoji = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    order_index = table.Column<int>(type: "integer", nullable: false),
                    vote_count = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_poll_option", x => x.id);
                    table.ForeignKey(
                        name: "FK_poll_option_poll_poll_id",
                        column: x => x.poll_id,
                        principalTable: "poll",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "poll_role_permission",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    poll_id = table.Column<int>(type: "integer", nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    is_allowed = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_poll_role_permission", x => x.id);
                    table.ForeignKey(
                        name: "FK_poll_role_permission_poll_poll_id",
                        column: x => x.poll_id,
                        principalTable: "poll",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reaction_role_button",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    reaction_role_id = table.Column<int>(type: "integer", nullable: false),
                    label = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    emoji = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    style = table.Column<int>(type: "integer", nullable: false),
                    order_index = table.Column<int>(type: "integer", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reaction_role_button", x => x.id);
                    table.ForeignKey(
                        name: "FK_reaction_role_button_reaction_role_reaction_role_id",
                        column: x => x.reaction_role_id,
                        principalTable: "reaction_role",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reaction_role_emoji",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    reaction_role_id = table.Column<int>(type: "integer", nullable: false),
                    emoji = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    order_index = table.Column<int>(type: "integer", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reaction_role_emoji", x => x.id);
                    table.ForeignKey(
                        name: "FK_reaction_role_emoji_reaction_role_reaction_role_id",
                        column: x => x.reaction_role_id,
                        principalTable: "reaction_role",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reaction_role_menu",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    reaction_role_id = table.Column<int>(type: "integer", nullable: false),
                    placeholder = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    min_values = table.Column<int>(type: "integer", nullable: false),
                    max_values = table.Column<int>(type: "integer", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reaction_role_menu", x => x.id);
                    table.ForeignKey(
                        name: "FK_reaction_role_menu_reaction_role_reaction_role_id",
                        column: x => x.reaction_role_id,
                        principalTable: "reaction_role",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reminder_embed_setting",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    reminder_settings_id = table.Column<int>(type: "integer", nullable: false),
                    slot = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    message = table.Column<string>(type: "text", nullable: true),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_description = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reminder_embed_setting", x => x.id);
                    table.ForeignKey(
                        name: "FK_reminder_embed_setting_reminder_settings_reminder_settings_~",
                        column: x => x.reminder_settings_id,
                        principalTable: "reminder_settings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "scheduled_announcement_run",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    announcement_id = table.Column<long>(type: "bigint", nullable: false),
                    planned_run_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    sent_message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    error_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scheduled_announcement_run", x => x.id);
                    table.ForeignKey(
                        name: "FK_scheduled_announcement_run_scheduled_announcement_announcem~",
                        column: x => x.announcement_id,
                        principalTable: "scheduled_announcement",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "statistics_channel_role",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    statistics_channel_id = table.Column<int>(type: "integer", nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    role_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    order_index = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_statistics_channel_role", x => x.id);
                    table.ForeignKey(
                        name: "FK_statistics_channel_role_statistics_channel_statistics_chann~",
                        column: x => x.statistics_channel_id,
                        principalTable: "statistics_channel",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "temporary_voice_channel",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    lobby_id = table.Column<int>(type: "integer", nullable: false),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    text_channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    owner_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    is_locked = table.Column<bool>(type: "boolean", nullable: false),
                    is_hidden = table.Column<bool>(type: "boolean", nullable: false),
                    user_limit = table.Column<int>(type: "integer", nullable: true),
                    bitrate = table.Column<int>(type: "integer", nullable: true),
                    banned_user_ids = table.Column<string>(type: "text", nullable: true),
                    last_activity_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_temporary_voice_channel", x => x.id);
                    table.ForeignKey(
                        name: "FK_temporary_voice_channel_temporary_voice_channel_lobby_lobby~",
                        column: x => x.lobby_id,
                        principalTable: "temporary_voice_channel_lobby",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "temporary_voice_channel_role",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    lobby_id = table.Column<int>(type: "integer", nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    role_type = table.Column<int>(type: "integer", nullable: false),
                    can_manage_access = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_temporary_voice_channel_role", x => x.id);
                    table.ForeignKey(
                        name: "FK_temporary_voice_channel_role_temporary_voice_channel_lobby_~",
                        column: x => x.lobby_id,
                        principalTable: "temporary_voice_channel_lobby",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ticket_panel_role",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ticket_panel_id = table.Column<int>(type: "integer", nullable: false),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_panel_role", x => x.id);
                    table.ForeignKey(
                        name: "FK_ticket_panel_role_ticket_panel_ticket_panel_id",
                        column: x => x.ticket_panel_id,
                        principalTable: "ticket_panel",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ticket_type",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ticket_panel_id = table.Column<int>(type: "integer", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    label = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    emoji = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    style = table.Column<int>(type: "integer", nullable: false),
                    placeholder = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    order_index = table.Column<int>(type: "integer", nullable: false),
                    open_category_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    open_category_name = table.Column<string>(type: "text", nullable: true),
                    claimed_category_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    claimed_category_name = table.Column<string>(type: "text", nullable: true),
                    closed_category_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    closed_category_name = table.Column<string>(type: "text", nullable: true),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_type", x => x.id);
                    table.ForeignKey(
                        name: "FK_ticket_type_ticket_panel_ticket_panel_id",
                        column: x => x.ticket_panel_id,
                        principalTable: "ticket_panel",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "welcome_card_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    welcome_id = table.Column<int>(type: "integer", nullable: false),
                    send_welcome_card = table.Column<bool>(type: "boolean", nullable: false),
                    card_title = table.Column<string>(type: "text", nullable: true),
                    card_username_text = table.Column<string>(type: "text", nullable: true),
                    card_member_text = table.Column<string>(type: "text", nullable: true),
                    card_background_color1 = table.Column<string>(type: "text", nullable: true),
                    card_background_color2 = table.Column<string>(type: "text", nullable: true),
                    card_text_color = table.Column<string>(type: "text", nullable: true),
                    card_border_color = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_welcome_card_settings", x => x.id);
                    table.ForeignKey(
                        name: "FK_welcome_card_settings_welcome_welcome_id",
                        column: x => x.welcome_id,
                        principalTable: "welcome",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "welcome_dm_card_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    welcome_id = table.Column<int>(type: "integer", nullable: false),
                    send_d_m_card = table.Column<bool>(type: "boolean", nullable: false),
                    d_m_card_title = table.Column<string>(type: "text", nullable: true),
                    d_m_card_username_text = table.Column<string>(type: "text", nullable: true),
                    d_m_card_member_text = table.Column<string>(type: "text", nullable: true),
                    d_m_card_background_color1 = table.Column<string>(type: "text", nullable: true),
                    d_m_card_background_color2 = table.Column<string>(type: "text", nullable: true),
                    d_m_card_text_color = table.Column<string>(type: "text", nullable: true),
                    d_m_card_border_color = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_welcome_dm_card_settings", x => x.id);
                    table.ForeignKey(
                        name: "FK_welcome_dm_card_settings_welcome_welcome_id",
                        column: x => x.welcome_id,
                        principalTable: "welcome",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "welcome_dm_embed_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    welcome_id = table.Column<int>(type: "integer", nullable: false),
                    is_d_m_embed = table.Column<bool>(type: "boolean", nullable: false),
                    d_m_embed_title = table.Column<string>(type: "text", nullable: true),
                    d_m_embed_color = table.Column<string>(type: "text", nullable: true),
                    d_m_embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    d_m_embed_image = table.Column<string>(type: "text", nullable: true),
                    d_m_embed_footer = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    d_m_embed_description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_welcome_dm_embed_settings", x => x.id);
                    table.ForeignKey(
                        name: "FK_welcome_dm_embed_settings_welcome_welcome_id",
                        column: x => x.welcome_id,
                        principalTable: "welcome",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "welcome_dm_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    welcome_id = table.Column<int>(type: "integer", nullable: false),
                    send_d_m = table.Column<bool>(type: "boolean", nullable: false),
                    d_m_message = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_welcome_dm_settings", x => x.id);
                    table.ForeignKey(
                        name: "FK_welcome_dm_settings_welcome_welcome_id",
                        column: x => x.welcome_id,
                        principalTable: "welcome",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "welcome_embed_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    welcome_id = table.Column<int>(type: "integer", nullable: false),
                    is_embed = table.Column<bool>(type: "boolean", nullable: false),
                    embed_title = table.Column<string>(type: "text", nullable: true),
                    embed_color = table.Column<string>(type: "text", nullable: true),
                    embed_thumbnail = table.Column<string>(type: "text", nullable: true),
                    embed_image = table.Column<string>(type: "text", nullable: true),
                    embed_footer = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    embed_description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_welcome_embed_settings", x => x.id);
                    table.ForeignKey(
                        name: "FK_welcome_embed_settings_welcome_welcome_id",
                        column: x => x.welcome_id,
                        principalTable: "welcome",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "application_audit",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    response_id = table.Column<long>(type: "bigint", nullable: false),
                    actor_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    action = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    before_json = table.Column<string>(type: "text", nullable: true),
                    after_json = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_application_audit", x => x.id);
                    table.ForeignKey(
                        name: "FK_application_audit_application_response_response_id",
                        column: x => x.response_id,
                        principalTable: "application_response",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "poll_vote",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    poll_id = table.Column<int>(type: "integer", nullable: false),
                    option_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_poll_vote", x => x.id);
                    table.ForeignKey(
                        name: "FK_poll_vote_poll_option_option_id",
                        column: x => x.option_id,
                        principalTable: "poll_option",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_poll_vote_poll_poll_id",
                        column: x => x.poll_id,
                        principalTable: "poll",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reaction_role_menu_option",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    menu_id = table.Column<int>(type: "integer", nullable: false),
                    label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    role_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    emoji = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    order_index = table.Column<int>(type: "integer", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reaction_role_menu_option", x => x.id);
                    table.ForeignKey(
                        name: "FK_reaction_role_menu_option_reaction_role_menu_menu_id",
                        column: x => x.menu_id,
                        principalTable: "reaction_role_menu",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ticket",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ticket_panel_id = table.Column<int>(type: "integer", nullable: false),
                    ticket_type_id = table.Column<int>(type: "integer", nullable: true),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    claimed_by = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    claimed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    closed_by = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    closed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    transcript_id = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_message_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_message_author_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket", x => x.id);
                    table.ForeignKey(
                        name: "FK_ticket_ticket_panel_ticket_panel_id",
                        column: x => x.ticket_panel_id,
                        principalTable: "ticket_panel",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ticket_ticket_type_ticket_type_id",
                        column: x => x.ticket_type_id,
                        principalTable: "ticket_type",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ticket_staff_read",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ticket_id = table.Column<int>(type: "integer", nullable: false),
                    staff_user_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    last_read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_staff_read", x => x.id);
                    table.ForeignKey(
                        name: "FK_ticket_staff_read_ticket_ticket_id",
                        column: x => x.ticket_id,
                        principalTable: "ticket",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ticket_transcript",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ticket_id = table.Column<int>(type: "integer", nullable: false),
                    guild_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    channel_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    message_id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    transcript_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    transcript_content = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_transcript", x => x.id);
                    table.ForeignKey(
                        name: "FK_ticket_transcript_ticket_ticket_id",
                        column: x => x.ticket_id,
                        principalTable: "ticket",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_moderation_policy_a_i_moderation_setting_guild_id",
                table: "ai_moderation_policy",
                column: "a_i_moderation_setting_guild_id");

            migrationBuilder.CreateIndex(
                name: "IX_ai_moderation_policy_guild_id_category",
                table: "ai_moderation_policy",
                columns: new[] { "guild_id", "category" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ai_moderation_queue_guild_id_message_id",
                table: "ai_moderation_queue",
                columns: new[] { "guild_id", "message_id" },
                unique: true,
                filter: "\"message_id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ai_moderation_queue_status_next_attempt_at",
                table: "ai_moderation_queue",
                columns: new[] { "status", "next_attempt_at" });

            migrationBuilder.CreateIndex(
                name: "IX_application_audit_response_id",
                table: "application_audit",
                column: "response_id");

            migrationBuilder.CreateIndex(
                name: "IX_application_form_guild_id",
                table: "application_form",
                column: "guild_id");

            migrationBuilder.CreateIndex(
                name: "IX_application_response_form_id",
                table: "application_response",
                column: "form_id");

            migrationBuilder.CreateIndex(
                name: "IX_application_response_guild_id_status",
                table: "application_response",
                columns: new[] { "guild_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_birthday_settings_guild_id",
                table: "birthday_settings",
                column: "guild_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_birthday_user_guild_id_user_id",
                table: "birthday_user",
                columns: new[] { "guild_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_custom_bots_bot_token",
                table: "custom_bots",
                column: "bot_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_custom_bots_client_id",
                table: "custom_bots",
                column: "client_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_custom_command_guild_id_command_name",
                table: "custom_command",
                columns: new[] { "guild_id", "command_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_embed_message_guild_id_enabled_name",
                table: "embed_message",
                columns: new[] { "guild_id", "enabled", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_embed_message_guild_id_name",
                table: "embed_message",
                columns: new[] { "guild_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_feed_subscription_guild_id",
                table: "feed_subscription",
                column: "guild_id");

            migrationBuilder.CreateIndex(
                name: "IX_forbidden_word_moderator_id",
                table: "forbidden_word",
                column: "moderator_id");

            migrationBuilder.CreateIndex(
                name: "IX_giveaway_is_active_is_ended_end_date",
                table: "giveaway",
                columns: new[] { "is_active", "is_ended", "end_date" },
                filter: "\"is_active\" = TRUE AND \"is_ended\" = FALSE");

            migrationBuilder.CreateIndex(
                name: "IX_giveaway_allowed_role_giveaway_id_role_id",
                table: "giveaway_allowed_role",
                columns: new[] { "giveaway_id", "role_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_giveaway_participant_giveaway_id_user_id",
                table: "giveaway_participant",
                columns: new[] { "giveaway_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_giveaway_role_giveaway_id_role_id",
                table: "giveaway_role",
                columns: new[] { "giveaway_id", "role_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_giveaway_winner_giveaway_id_user_id",
                table: "giveaway_winner",
                columns: new[] { "giveaway_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_goodbye_guild_id_language",
                table: "goodbye",
                columns: new[] { "guild_id", "language" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_goodbye_embed_settings_goodbye_id",
                table: "goodbye_embed_settings",
                column: "goodbye_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_guild_auto_role_audit_guild_id",
                table: "guild_auto_role_audit",
                column: "guild_id");

            migrationBuilder.CreateIndex(
                name: "IX_guild_auto_role_role_guild_id_role_id",
                table: "guild_auto_role_role",
                columns: new[] { "guild_id", "role_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_guild_automation_guild_id_enabled",
                table: "guild_automation",
                columns: new[] { "guild_id", "enabled" });

            migrationBuilder.CreateIndex(
                name: "IX_guild_custom_command_usage_command_id",
                table: "guild_custom_command_usage",
                column: "command_id");

            migrationBuilder.CreateIndex(
                name: "IX_guild_embed_template_guild_id_kind_parent_entity_id_slot",
                table: "guild_embed_template",
                columns: new[] { "guild_id", "kind", "parent_entity_id", "slot" });

            migrationBuilder.CreateIndex(
                name: "IX_guild_features_guild_id_feature_name",
                table: "guild_features",
                columns: new[] { "guild_id", "feature_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_guild_github_inbound_inbound_token",
                table: "guild_github_inbound",
                column: "inbound_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_guild_invite_contribution_guild_id_joined_user_id",
                table: "guild_invite_contribution",
                columns: new[] { "guild_id", "joined_user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_guild_invite_stats_guild_id_period_key_count",
                table: "guild_invite_stats",
                columns: new[] { "guild_id", "period_key", "count" },
                descending: new[] { false, false, true });

            migrationBuilder.CreateIndex(
                name: "IX_guilds_guild_id",
                table: "guilds",
                column: "guild_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_help_command_guild_id_command_name",
                table: "help_command",
                columns: new[] { "guild_id", "command_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_help_command_channel_help_command_id_channel_id",
                table: "help_command_channel",
                columns: new[] { "help_command_id", "channel_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_help_command_role_help_command_id_role_id",
                table: "help_command_role",
                columns: new[] { "help_command_id", "role_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_level_guild_id",
                table: "level",
                column: "guild_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_log_channel_guild_id",
                table: "log_channel",
                column: "guild_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_log_channel_embed_settings_log_channel_id",
                table: "log_channel_embed_settings",
                column: "log_channel_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_log_channel_type_log_channel_id_log_type",
                table: "log_channel_type",
                columns: new[] { "log_channel_id", "log_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_moderation_action_log_guild_id_created_at_id",
                table: "moderation_action_log",
                columns: new[] { "guild_id", "created_at", "id" },
                descending: new[] { false, true, true });

            migrationBuilder.CreateIndex(
                name: "IX_moderation_user_notice_action_log_id",
                table: "moderation_user_notice",
                column: "action_log_id");

            migrationBuilder.CreateIndex(
                name: "IX_moderator_guild_id",
                table: "moderator",
                column: "guild_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_moderator_rule_moderator_id_rule_type",
                table: "moderator_rule",
                columns: new[] { "moderator_id", "rule_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_music_favorites_guild_id_user_id_track_id",
                table: "music_favorites",
                columns: new[] { "guild_id", "user_id", "track_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_music_history_guild_id_started_at",
                table: "music_history",
                columns: new[] { "guild_id", "started_at" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_music_history_session_id",
                table: "music_history",
                column: "session_id");

            migrationBuilder.CreateIndex(
                name: "IX_music_playlist_import_jobs_playlist_id",
                table: "music_playlist_import_jobs",
                column: "playlist_id");

            migrationBuilder.CreateIndex(
                name: "IX_music_playlist_items_playlist_id",
                table: "music_playlist_items",
                column: "playlist_id");

            migrationBuilder.CreateIndex(
                name: "IX_music_playlists_guild_id_external_provider_external_playlis~",
                table: "music_playlists",
                columns: new[] { "guild_id", "external_provider", "external_playlist_id" });

            migrationBuilder.CreateIndex(
                name: "IX_music_playlists_guild_id_owner_user_id",
                table: "music_playlists",
                columns: new[] { "guild_id", "owner_user_id" });

            migrationBuilder.CreateIndex(
                name: "IX_music_session_participants_session_id_user_id",
                table: "music_session_participants",
                columns: new[] { "session_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_panel_audit_log_guild_id_created_at_utc_id",
                table: "panel_audit_log",
                columns: new[] { "guild_id", "created_at_utc", "id" },
                descending: new[] { false, true, true });

            migrationBuilder.CreateIndex(
                name: "IX_poll_guild_id",
                table: "poll",
                column: "guild_id",
                filter: "\"is_active\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_poll_guild_id_created_at_id",
                table: "poll",
                columns: new[] { "guild_id", "created_at", "id" },
                descending: new[] { false, true, true });

            migrationBuilder.CreateIndex(
                name: "IX_poll_option_poll_id",
                table: "poll_option",
                column: "poll_id");

            migrationBuilder.CreateIndex(
                name: "IX_poll_role_permission_poll_id_role_id",
                table: "poll_role_permission",
                columns: new[] { "poll_id", "role_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_poll_vote_option_id",
                table: "poll_vote",
                column: "option_id");

            migrationBuilder.CreateIndex(
                name: "IX_poll_vote_poll_id_user_id_option_id",
                table: "poll_vote",
                columns: new[] { "poll_id", "user_id", "option_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reaction_role_button_reaction_role_id",
                table: "reaction_role_button",
                column: "reaction_role_id");

            migrationBuilder.CreateIndex(
                name: "IX_reaction_role_emoji_reaction_role_id",
                table: "reaction_role_emoji",
                column: "reaction_role_id");

            migrationBuilder.CreateIndex(
                name: "IX_reaction_role_menu_reaction_role_id",
                table: "reaction_role_menu",
                column: "reaction_role_id");

            migrationBuilder.CreateIndex(
                name: "IX_reaction_role_menu_option_menu_id",
                table: "reaction_role_menu_option",
                column: "menu_id");

            migrationBuilder.CreateIndex(
                name: "IX_reminder_guild_id_is_sent_remind_date",
                table: "reminder",
                columns: new[] { "guild_id", "is_sent", "remind_date" });

            migrationBuilder.CreateIndex(
                name: "IX_reminder_embed_setting_reminder_settings_id_slot",
                table: "reminder_embed_setting",
                columns: new[] { "reminder_settings_id", "slot" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reminder_settings_guild_id",
                table: "reminder_settings",
                column: "guild_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_scheduled_announcement_run_announcement_id_planned_run_at_u~",
                table: "scheduled_announcement_run",
                columns: new[] { "announcement_id", "planned_run_at_utc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_statistics_channel_guild_id_counter_type",
                table: "statistics_channel",
                columns: new[] { "guild_id", "counter_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_statistics_channel_role_statistics_channel_id_role_id",
                table: "statistics_channel_role",
                columns: new[] { "statistics_channel_id", "role_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_temporary_voice_channel_lobby_id",
                table: "temporary_voice_channel",
                column: "lobby_id");

            migrationBuilder.CreateIndex(
                name: "IX_temporary_voice_channel_role_lobby_id",
                table: "temporary_voice_channel_role",
                column: "lobby_id");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_guild_id_created_at",
                table: "ticket",
                columns: new[] { "guild_id", "created_at" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_ticket_ticket_panel_id",
                table: "ticket",
                column: "ticket_panel_id");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_ticket_type_id",
                table: "ticket",
                column: "ticket_type_id");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_panel_guild_id",
                table: "ticket_panel",
                column: "guild_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ticket_panel_role_ticket_panel_id_role_id",
                table: "ticket_panel_role",
                columns: new[] { "ticket_panel_id", "role_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ticket_staff_read_staff_user_id_ticket_id",
                table: "ticket_staff_read",
                columns: new[] { "staff_user_id", "ticket_id" });

            migrationBuilder.CreateIndex(
                name: "IX_ticket_staff_read_ticket_id_staff_user_id",
                table: "ticket_staff_read",
                columns: new[] { "ticket_id", "staff_user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ticket_transcript_guild_id_created_at",
                table: "ticket_transcript",
                columns: new[] { "guild_id", "created_at" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_ticket_transcript_ticket_id",
                table: "ticket_transcript",
                column: "ticket_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ticket_type_ticket_panel_id",
                table: "ticket_type",
                column: "ticket_panel_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_level_guild_id_total_xp",
                table: "user_level",
                columns: new[] { "guild_id", "total_xp" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_user_level_guild_id_user_id",
                table: "user_level",
                columns: new[] { "guild_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_welcome_guild_id_language",
                table: "welcome",
                columns: new[] { "guild_id", "language" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_welcome_card_settings_welcome_id",
                table: "welcome_card_settings",
                column: "welcome_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_welcome_dm_card_settings_welcome_id",
                table: "welcome_dm_card_settings",
                column: "welcome_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_welcome_dm_embed_settings_welcome_id",
                table: "welcome_dm_embed_settings",
                column: "welcome_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_welcome_dm_settings_welcome_id",
                table: "welcome_dm_settings",
                column: "welcome_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_welcome_embed_settings_welcome_id",
                table: "welcome_embed_settings",
                column: "welcome_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_moderation_capacity_usage");

            migrationBuilder.DropTable(
                name: "ai_moderation_excluded_channel");

            migrationBuilder.DropTable(
                name: "ai_moderation_policy");

            migrationBuilder.DropTable(
                name: "ai_moderation_queue");

            migrationBuilder.DropTable(
                name: "application_audit");

            migrationBuilder.DropTable(
                name: "birthday_settings");

            migrationBuilder.DropTable(
                name: "birthday_user");

            migrationBuilder.DropTable(
                name: "custom_bots");

            migrationBuilder.DropTable(
                name: "embed_message");

            migrationBuilder.DropTable(
                name: "feed_item_delivery");

            migrationBuilder.DropTable(
                name: "forbidden_word");

            migrationBuilder.DropTable(
                name: "giveaway_allowed_role");

            migrationBuilder.DropTable(
                name: "giveaway_participant");

            migrationBuilder.DropTable(
                name: "giveaway_role");

            migrationBuilder.DropTable(
                name: "giveaway_winner");

            migrationBuilder.DropTable(
                name: "goodbye_embed_settings");

            migrationBuilder.DropTable(
                name: "guild_auto_role_audit");

            migrationBuilder.DropTable(
                name: "guild_auto_role_role");

            migrationBuilder.DropTable(
                name: "guild_automation");

            migrationBuilder.DropTable(
                name: "guild_backup_job");

            migrationBuilder.DropTable(
                name: "guild_custom_command_usage");

            migrationBuilder.DropTable(
                name: "guild_embed_template");

            migrationBuilder.DropTable(
                name: "guild_features");

            migrationBuilder.DropTable(
                name: "guild_github_inbound");

            migrationBuilder.DropTable(
                name: "guild_invite_contribution");

            migrationBuilder.DropTable(
                name: "guild_invite_snapshot");

            migrationBuilder.DropTable(
                name: "guild_invite_stats");

            migrationBuilder.DropTable(
                name: "guild_locale_setting");

            migrationBuilder.DropTable(
                name: "guild_member_event");

            migrationBuilder.DropTable(
                name: "guild_music_priority");

            migrationBuilder.DropTable(
                name: "guild_report_job");

            migrationBuilder.DropTable(
                name: "guild_report_notify");

            migrationBuilder.DropTable(
                name: "guild_user_activity_day");

            migrationBuilder.DropTable(
                name: "help_command_channel");

            migrationBuilder.DropTable(
                name: "help_command_role");

            migrationBuilder.DropTable(
                name: "level");

            migrationBuilder.DropTable(
                name: "level_ignored_channel");

            migrationBuilder.DropTable(
                name: "level_ignored_role");

            migrationBuilder.DropTable(
                name: "level_role_reward");

            migrationBuilder.DropTable(
                name: "log_channel_embed_settings");

            migrationBuilder.DropTable(
                name: "log_channel_type");

            migrationBuilder.DropTable(
                name: "moderation_user_notice");

            migrationBuilder.DropTable(
                name: "moderator_rule");

            migrationBuilder.DropTable(
                name: "music_blacklisted_text_channel");

            migrationBuilder.DropTable(
                name: "music_favorites");

            migrationBuilder.DropTable(
                name: "music_history");

            migrationBuilder.DropTable(
                name: "music_lyrics_cache");

            migrationBuilder.DropTable(
                name: "music_playlist_import_jobs");

            migrationBuilder.DropTable(
                name: "music_playlist_items");

            migrationBuilder.DropTable(
                name: "music_radio_stations");

            migrationBuilder.DropTable(
                name: "music_session_participants");

            migrationBuilder.DropTable(
                name: "panel_audit_log");

            migrationBuilder.DropTable(
                name: "poll_role_permission");

            migrationBuilder.DropTable(
                name: "poll_vote");

            migrationBuilder.DropTable(
                name: "reaction_role_button");

            migrationBuilder.DropTable(
                name: "reaction_role_emoji");

            migrationBuilder.DropTable(
                name: "reaction_role_menu_option");

            migrationBuilder.DropTable(
                name: "reminder");

            migrationBuilder.DropTable(
                name: "reminder_embed_setting");

            migrationBuilder.DropTable(
                name: "scheduled_announcement_run");

            migrationBuilder.DropTable(
                name: "statistics_channel_role");

            migrationBuilder.DropTable(
                name: "temporary_voice_channel");

            migrationBuilder.DropTable(
                name: "temporary_voice_channel_role");

            migrationBuilder.DropTable(
                name: "ticket_panel_role");

            migrationBuilder.DropTable(
                name: "ticket_staff_read");

            migrationBuilder.DropTable(
                name: "ticket_transcript");

            migrationBuilder.DropTable(
                name: "user_level");

            migrationBuilder.DropTable(
                name: "welcome_card_settings");

            migrationBuilder.DropTable(
                name: "welcome_dm_card_settings");

            migrationBuilder.DropTable(
                name: "welcome_dm_embed_settings");

            migrationBuilder.DropTable(
                name: "welcome_dm_settings");

            migrationBuilder.DropTable(
                name: "welcome_embed_settings");

            migrationBuilder.DropTable(
                name: "ai_moderation_setting");

            migrationBuilder.DropTable(
                name: "application_response");

            migrationBuilder.DropTable(
                name: "feed_subscription");

            migrationBuilder.DropTable(
                name: "giveaway");

            migrationBuilder.DropTable(
                name: "goodbye");

            migrationBuilder.DropTable(
                name: "guild_auto_role_setting");

            migrationBuilder.DropTable(
                name: "custom_command");

            migrationBuilder.DropTable(
                name: "guilds");

            migrationBuilder.DropTable(
                name: "help_command");

            migrationBuilder.DropTable(
                name: "log_channel");

            migrationBuilder.DropTable(
                name: "moderation_action_log");

            migrationBuilder.DropTable(
                name: "moderator");

            migrationBuilder.DropTable(
                name: "music_settings");

            migrationBuilder.DropTable(
                name: "music_playlists");

            migrationBuilder.DropTable(
                name: "music_sessions");

            migrationBuilder.DropTable(
                name: "poll_option");

            migrationBuilder.DropTable(
                name: "reaction_role_menu");

            migrationBuilder.DropTable(
                name: "reminder_settings");

            migrationBuilder.DropTable(
                name: "scheduled_announcement");

            migrationBuilder.DropTable(
                name: "statistics_channel");

            migrationBuilder.DropTable(
                name: "temporary_voice_channel_lobby");

            migrationBuilder.DropTable(
                name: "ticket");

            migrationBuilder.DropTable(
                name: "welcome");

            migrationBuilder.DropTable(
                name: "application_form");

            migrationBuilder.DropTable(
                name: "poll");

            migrationBuilder.DropTable(
                name: "reaction_role");

            migrationBuilder.DropTable(
                name: "ticket_type");

            migrationBuilder.DropTable(
                name: "ticket_panel");
        }
    }
}
