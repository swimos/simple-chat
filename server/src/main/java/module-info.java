open module swim.chat {
  requires transitive swim.loader;
  requires transitive swim.client;

  exports swim.chat;

  provides swim.api.plane.Plane with swim.chat.ChatPlane;
}
