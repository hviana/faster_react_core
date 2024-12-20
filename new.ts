const source = "https://github.com/hviana/faster_react.git";
import { exists } from "jsr:@std/fs@1.0.3";
import { join } from "jsr:@std/path@1.0.6";

const commandHelp =
  `Check if the command is correct: deno run -A -r "https://deno.land/x/faster_react_core/new.ts" myProjectFolder`;
const folderName = Deno.args[0];
if (!folderName) {
  console.log(commandHelp);
  throw new Error("Enter a project folder name");
}
const isCloned = await exists(join(folderName, ".git"));

if (isCloned) {
  console.log(`Folder project '${folderName}' already exist.`);
} else {
  const command = new Deno.Command("git", {
    args: ["clone", source, folderName],
  });
  const { success, stdout } = await command.output();
  if (!success) {
    console.log(commandHelp);
    throw new Error(
      "Failed to create project folder. Make sure you have the git command installed and configured.",
    );
  } else {
    await Deno.remove(`${folderName}/.git`, { recursive: true });
    console.log(`Project folder ${folderName} created successfully`);
  }
}
