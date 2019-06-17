package swim.chat;

import java.io.IOException;
import swim.api.SwimRoute;
import swim.api.agent.AgentType;
import swim.api.plane.AbstractPlane;
import swim.api.plane.PlaneContext;
import swim.api.server.ServerContext;
import swim.chat.auth.AuthAgent;
import swim.chat.auth.AuthPolicy;
import swim.loader.ServerLoader;
import swim.structure.Value;

/**
 * Basic swim plane. sets up routes to WebAgent and 
 * starts the server and plane
 */
public class ChatPlane extends AbstractPlane {

  /**
   * define route to the Rooms webagent to manage the chat room for this server
   */
  @SwimRoute("/rooms")
  final AgentType<RoomsAgent> roomsAgent = agentClass(RoomsAgent.class);

  /**
   * define route to handle dynamically created webagent for each room on the server
   */
  @SwimRoute("/room/:id")
  final AgentType<RoomAgent> roomAgent = agentClass(RoomAgent.class);

  public ChatPlane() {
    // no-op
  }

  /**
   * app main method. creates swim server, swim plane and starts everything
   */
  public static void main(String[] args) throws IOException, InterruptedException {
    final ServerContext server = ServerLoader.load(ChatPlane.class.getModule()).serverContext();
    final PlaneContext plane = server.getPlane("chat").planeContext();

    server.start();
    System.out.println("Running ChatPlane...");
    server.run();

    // send a command to the Rooms WebAgent to 
    plane.command("/rooms/", "WAKE", Value.absent());
  }
}
