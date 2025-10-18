// Contact Links Management for Telegram Admin
import { sendMessage, supabaseAdmin } from "./common.ts";
import { logAdminAction } from "../database-utils.ts";

interface ContactLink {
  id?: string;
  platform: string;
  display_name: string;
  url: string;
  icon_emoji?: string;
  is_active: boolean;
  display_order: number;
}

type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

function toContactArray(
  input: ContactLink | ContactLink[] | null,
): ContactLink[] {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
}

// Handle Contact Links Management
export async function handleContactLinksManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: contacts, error } = await supabaseAdmin
      .from("contact_links")
      .select("*")
      .returns<ContactLink>()
      .order("display_order", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Error fetching contact_links:", error);
      await sendMessage(chatId, "❌ Error fetching contact links.");
      return;
    }

    const totalContacts = await supabaseAdmin
      .from("contact_links")
      .select("count", { count: "exact" });

    const activeContacts = await supabaseAdmin
      .from("contact_links")
      .select("count", { count: "exact" })
      .eq("is_active", true);

    let contactMessage = `📞 *Contact Links Management*

📊 *Statistics:*
• Total Links: ${totalContacts.count || 0}
• Active Links: ${activeContacts.count || 0}

🔗 *Current Contact Links:*`;

    const contactList = toContactArray(contacts);

    if (contactList.length > 0) {
      contactList.forEach((contact, index) => {
        const status = contact.is_active ? "✅" : "❌";
        const emoji = contact.icon_emoji || "🔗";
        contactMessage += `
${index + 1}. ${status} ${emoji} **${contact.display_name}**
   📱 Platform: ${contact.platform}
   🔗 URL: ${contact.url.substring(0, 50)}${
          contact.url.length > 50 ? "..." : ""
        }
   📊 Order: ${contact.display_order}`;
      });
    } else {
      contactMessage += "\n\n*No contact links found.*";
    }

    const contactKeyboard = {
      inline_keyboard: [
        [
          { text: "➕ Add Link", callback_data: "add_contact_link" },
          { text: "✏️ Edit Link", callback_data: "edit_contact_link" },
        ],
        [
          { text: "🔄 Toggle Active", callback_data: "toggle_contact_link" },
          { text: "🗑️ Delete Link", callback_data: "delete_contact_link" },
        ],
        [
          { text: "↕️ Reorder", callback_data: "reorder_contact_links" },
          { text: "📊 Export", callback_data: "export_contact_links" },
        ],
        [
          { text: "🔄 Refresh", callback_data: "manage_table_contact_links" },
          { text: "🔙 Back", callback_data: "table_management" },
        ],
      ],
    };

    await sendMessage(chatId, contactMessage, contactKeyboard);
  } catch (error) {
    console.error("Error in contact links management:", error);
    await sendMessage(chatId, "❌ Error managing contact links.");
  }
}

// Add new contact link
export async function handleAddContactLink(
  chatId: number,
  _userId: string,
): Promise<void> {
  const message = `➕ *Add New Contact Link*

Please send the contact link details in this format:
\`\`\`
Platform: Telegram
Display Name: Customer Support
URL: https://t.me/support
Icon Emoji: 💬
\`\`\`

*Required fields:*
• Platform (e.g., Telegram, WhatsApp, Email, Phone)
• Display Name (e.g., Customer Support)
• URL (full link including https://)

*Optional fields:*
• Icon Emoji (e.g., 💬, 📧, 📞)

Reply with the details or use /cancel to abort.`;

  await sendMessage(chatId, message);
  // Note: The actual text processing would be handled by the main bot handler
}

// Edit existing contact link
export async function handleEditContactLink(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: contacts, error } = await supabaseAdmin
      .from("contact_links")
      .select("*")
      .returns<ContactLink>()
      .order("display_order", { ascending: true })
      .limit(20);

    const contactList = toContactArray(contacts);

    if (error || contactList.length === 0) {
      await sendMessage(chatId, "❌ No contact links found to edit.");
      return;
    }

    let message = `✏️ *Edit Contact Link*

Select a contact link to edit:

`;

    const keyboard: InlineKeyboard = { inline_keyboard: [] };

    contactList.forEach((contact, index) => {
      const status = contact.is_active ? "✅" : "❌";
      const emoji = contact.icon_emoji || "🔗";
      message += `${
        index + 1
      }. ${status} ${emoji} ${contact.display_name} (${contact.platform})\n`;

      keyboard.inline_keyboard.push([{
        text: `${index + 1}. ${contact.display_name}`,
        callback_data: `edit_contact_${contact.id}`,
      }]);
    });

    keyboard.inline_keyboard.push([
      { text: "🔙 Back", callback_data: "manage_table_contact_links" },
    ]);

    await sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error("Error editing contact link:", error);
    await sendMessage(chatId, "❌ Error retrieving contact links for editing.");
  }
}

// Toggle contact link active status
export async function handleToggleContactLink(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: contacts, error } = await supabaseAdmin
      .from("contact_links")
      .select("*")
      .returns<ContactLink>()
      .order("display_order", { ascending: true })
      .limit(20);

    const contactList = toContactArray(contacts);

    if (error || contactList.length === 0) {
      await sendMessage(chatId, "❌ No contact links found to toggle.");
      return;
    }

    let message = `🔄 *Toggle Contact Link Status*

Select a contact link to toggle:

`;

    const keyboard: InlineKeyboard = { inline_keyboard: [] };

    contactList.forEach((contact, index) => {
      const status = contact.is_active ? "✅ Active" : "❌ Inactive";
      const emoji = contact.icon_emoji || "🔗";
      message += `${index + 1}. ${status} ${emoji} ${contact.display_name}\n`;

      keyboard.inline_keyboard.push([{
        text: `${index + 1}. ${contact.display_name} (${status})`,
        callback_data: `toggle_contact_${contact.id}`,
      }]);
    });

    keyboard.inline_keyboard.push([
      { text: "🔙 Back", callback_data: "manage_table_contact_links" },
    ]);

    await sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error("Error toggling contact link:", error);
    await sendMessage(
      chatId,
      "❌ Error retrieving contact links for toggling.",
    );
  }
}

// Delete contact link
export async function handleDeleteContactLink(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: contacts, error } = await supabaseAdmin
      .from("contact_links")
      .select("*")
      .returns<ContactLink>()
      .order("display_order", { ascending: true })
      .limit(20);

    const contactList = toContactArray(contacts);

    if (error || contactList.length === 0) {
      await sendMessage(chatId, "❌ No contact links found to delete.");
      return;
    }

    let message = `🗑️ *Delete Contact Link*

⚠️ **Warning:** This action cannot be undone!

Select a contact link to delete:

`;

    const keyboard: InlineKeyboard = { inline_keyboard: [] };

    contactList.forEach((contact, index) => {
      const status = contact.is_active ? "✅" : "❌";
      const emoji = contact.icon_emoji || "🔗";
      message += `${
        index + 1
      }. ${status} ${emoji} ${contact.display_name} (${contact.platform})\n`;

      keyboard.inline_keyboard.push([{
        text: `🗑️ ${index + 1}. ${contact.display_name}`,
        callback_data: `delete_contact_${contact.id}`,
      }]);
    });

    keyboard.inline_keyboard.push([
      { text: "🔙 Back", callback_data: "manage_table_contact_links" },
    ]);

    await sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error("Error deleting contact link:", error);
    await sendMessage(
      chatId,
      "❌ Error retrieving contact links for deletion.",
    );
  }
}

// Reorder contact links
export async function handleReorderContactLinks(
  chatId: number,
  _userId: string,
): Promise<void> {
  const message = `↕️ *Reorder Contact Links*

To reorder contact links, send the new order as numbers separated by commas.

Example: \`1,3,2,4\` (this would move item 3 to position 2)

Current order will be shown after you start the reorder process.

Use /cancel to abort reordering.`;

  await sendMessage(chatId, message);
}

// Process contact link operations
export async function processContactLinkOperation(
  chatId: number,
  userId: string,
  operation: string,
  contactId: string,
): Promise<void> {
  try {
    switch (operation) {
      case "toggle": {
        const { data: contact, error: fetchError } = await supabaseAdmin
          .from("contact_links")
          .select("*")
          .returns<ContactLink>()
          .eq("id", contactId)
          .single();

        const contactRecord = Array.isArray(contact)
          ? contact[0] ?? null
          : contact;

        if (fetchError || !contactRecord) {
          await sendMessage(chatId, "❌ Contact link not found.");
          return;
        }

        const { error: updateError } = await supabaseAdmin
          .from("contact_links")
          .update({ is_active: !contactRecord.is_active })
          .eq("id", contactId);

        if (updateError) {
          await sendMessage(chatId, "❌ Failed to toggle contact link status.");
          return;
        }

        await logAdminAction(
          userId,
          "toggle_contact_link",
          `Toggled contact link: ${contactRecord.display_name}`,
          "contact_links",
          contactId,
        );

        const newStatus = !contactRecord.is_active
          ? "activated"
          : "deactivated";
        await sendMessage(
          chatId,
          `✅ Contact link "${contactRecord.display_name}" has been ${newStatus}.`,
        );
        break;
      }

      case "delete": {
        const { data: deleteContact, error: deleteError } = await supabaseAdmin
          .from("contact_links")
          .delete()
          .eq("id", contactId)
          .select()
          .returns<ContactLink>()
          .single();

        const deleteRecord = Array.isArray(deleteContact)
          ? deleteContact[0] ?? null
          : deleteContact;

        if (deleteError || !deleteRecord) {
          await sendMessage(chatId, "❌ Failed to delete contact link.");
          return;
        }

        await logAdminAction(
          userId,
          "delete_contact_link",
          `Deleted contact link: ${deleteRecord.display_name}`,
          "contact_links",
          contactId,
        );

        await sendMessage(
          chatId,
          `✅ Contact link "${deleteRecord.display_name}" has been deleted.`,
        );
        break;
      }

      default:
        await sendMessage(chatId, "❌ Unknown operation.");
    }
  } catch (error) {
    console.error("Error processing contact link operation:", error);
    await sendMessage(chatId, "❌ Error processing contact link operation.");
  }
}
