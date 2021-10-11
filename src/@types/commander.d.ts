import { Command } from "commander";
declare module 'commander' {
  const command: Command;
  export default command;
}
