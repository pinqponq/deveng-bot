using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Deveng.Discord.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CustomBotPersonalization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "activity_text",
                table: "custom_bots",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "activity_type",
                table: "custom_bots",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Playing");

            migrationBuilder.AddColumn<string>(
                name: "avatar_url",
                table: "custom_bots",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "banner_url",
                table: "custom_bots",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "personalization_enabled",
                table: "custom_bots",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "presence_status",
                table: "custom_bots",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "online");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "activity_text", table: "custom_bots");
            migrationBuilder.DropColumn(name: "activity_type", table: "custom_bots");
            migrationBuilder.DropColumn(name: "avatar_url", table: "custom_bots");
            migrationBuilder.DropColumn(name: "banner_url", table: "custom_bots");
            migrationBuilder.DropColumn(name: "personalization_enabled", table: "custom_bots");
            migrationBuilder.DropColumn(name: "presence_status", table: "custom_bots");
        }
    }
}
