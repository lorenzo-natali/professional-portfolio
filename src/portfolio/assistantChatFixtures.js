/**
 * DEVELOPMENT ONLY.
 * Fixture transcript for tests of the conversation layout.
 * The portfolio application must not import this module.
 * These strings are not live AI responses.
 */

export const developmentConversationFixture = {
  messages: [
    {
      id: "dev-user",
      role: "user",
      text: "Development-only sample question.",
    },
    {
      id: "dev-assistant",
      role: "assistant",
      developmentOnly: true,
      text: "Development-only sample answer. This is not a live model response.",
      signalIds: ["exp-boc", "missing-signal-id"],
    },
  ],
};
