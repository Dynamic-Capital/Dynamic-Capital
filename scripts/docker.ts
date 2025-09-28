/**
 * Lightweight proxy script that forwards commands to the local Docker CLI.
 *
 * This allows running Docker commands through `deno run docker ...` so we
 * benefit from Deno's permission model and consistent tooling. The script
 * simply hands through any CLI arguments to the `docker` binary and mirrors
 * its exit code.
 */

if (import.meta.main) {
  if (Deno.args.length === 0) {
    console.error("Usage: deno run docker <docker arguments...>");
    console.error(
      "Example: deno run docker build --push -t dynamiccapital/scout-demo:v1",
    );
    Deno.exit(1);
  }

  try {
    const command = new Deno.Command("docker", {
      args: Deno.args,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    const child = command.spawn();
    const status = await child.status;

    if (!status.success) {
      Deno.exit(status.code ?? 1);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(
        "Docker CLI not found. Please install Docker and ensure it is in your PATH.",
      );
      Deno.exit(127);
    }

    console.error("Failed to execute docker:", error);
    Deno.exit(1);
  }
}
