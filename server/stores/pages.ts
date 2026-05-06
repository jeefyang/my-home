import { nanoid } from "nanoid";
import { UsersFolder, DATA_DIR,PagesFolder } from "./data";
import fs from "fs";
import path from "path";
import { getUser } from "./users";

export function initPages(userPathID: string) {
    const data = getUser(userPathID);
    if (data[1]) {
        return [undefined, data[1]];
    }
    const user = data[0]!;
    
}