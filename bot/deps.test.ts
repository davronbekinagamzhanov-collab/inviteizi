import { afterEach, it, expect, vi } from "vitest";
import { createBotDeps } from "./deps";
import { uploadFile } from "@/lib/storage";
vi.mock("./repo-pg",()=>({createPgRepo:()=>({})}));
vi.mock("./telegram",()=>({createTg:()=>({getFileUrl:async()=>"https://api.telegram.org/file/bot111:TEST/music/file.mp3"})}));
vi.mock("@/lib/storage",()=>({uploadFile:vi.fn(async()=>"https://files.invalid/music/opaque.mp3")}));
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it("new public audio URLs contain neither Telegram user ID, file ID nor bot token",async()=>{
  for(const [key,value] of Object.entries({TELEGRAM_BOT_TOKEN:"111:TEST",OWNER_USERNAME:"owner",KASPI_PHONE:"+70000000000",KASPI_NAME:"Test"})) vi.stubEnv(key,value);
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(new Uint8Array([1,2,3]))));
  const url=await createBotDeps().saveMusic!("PRIVATE_FILE_ID",123456789);
  expect(url).toBe("https://files.invalid/music/opaque.mp3");
  const path=vi.mocked(uploadFile).mock.calls[0][1];
  expect(path).toMatch(/^own\/[0-9a-f-]+\.mp3$/);
  expect(path).not.toContain("123456789");expect(path).not.toContain("PRIVATE_FILE_ID");expect(path).not.toContain("111:TEST");
  await createBotDeps().saveMusic!("PRIVATE_FILE_ID",123456789);
  expect(vi.mocked(uploadFile).mock.calls[1][1]).toBe(path);
});

it.each(["declared", "streamed"])("rejects %s audio over 12 MiB before writing Storage, even without reliable Telegram metadata",async kind=>{
  for(const [key,value] of Object.entries({TELEGRAM_BOT_TOKEN:"111:TEST",OWNER_USERNAME:"owner",KASPI_PHONE:"+70000000000",KASPI_NAME:"Test"})) vi.stubEnv(key,value);
  vi.mocked(uploadFile).mockClear();
  let cancelled=false;
  const response=kind==="declared"
    ? new Response(new Uint8Array([1]),{headers:{"content-length":String(12*1024*1024+1)}})
    : new Response(new ReadableStream({
      start(controller){for(let i=0;i<22;i++)controller.enqueue(new Uint8Array(1024*1024));},
      cancel(){cancelled=true;},
    }));
  vi.stubGlobal("fetch",vi.fn(async()=>response));
  await expect(createBotDeps().saveMusic!("OVERSIZED",1)).rejects.toThrow(/12/);
  expect(uploadFile).not.toHaveBeenCalled();
  if(kind==="streamed")expect(cancelled).toBe(true);
});
