import {spawnSync} from "node:child_process";
import {it,expect} from "vitest";

const fixture={TELEGRAM_BOT_TOKEN:"123456789:"+"A".repeat(35),TELEGRAM_WEBHOOK_SECRET:"W".repeat(32),OWNER_USERNAME:"fixture_owner",OWNER_TELEGRAM_ID:"111111111",ADMIN_IDS:"111111111",ANALYTICS_SIGNING_SECRET:"S".repeat(40),KASPI_PHONE:"+70000000000",KASPI_NAME:"Fixture recipient",STORAGE_GATE_SECRET:"G".repeat(40),DATABASE_URL:"postgres://inviteizi_server.fixture:TEST_PASSWORD@db.invalid:6543/postgres"};
function check(values:Record<string,string>){return spawnSync(process.execPath,["scripts/check-release-env.mjs"],{encoding:"utf8",env:{NODE_ENV:"test",SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,...values}});}
it("release preflight accepts format-valid runtime env without printing any provided values",()=>{
  const r=check(fixture);expect(r.status).toBe(0);expect(JSON.parse(r.stdout).passed).toBe(true);
  for(const secret of Object.values(fixture))expect(r.stdout+r.stderr).not.toContain(secret);
});
it("release preflight fails closed on invalid/missing configuration and keeps optional card absent",()=>{
  const r=check({OWNER_TELEGRAM_ID:"not-an-id",DATABASE_URL:"postgres://postgres:PRIVATE_PASSWORD@db.invalid/postgres"});
  expect(r.status).toBe(1);const report=JSON.parse(r.stdout);
  expect(report.passed).toBe(false);expect(report.rows).toContainEqual({key:"PAYMENT_CARD_NUMBER",status:"not-set",required:false});
  expect(report.rows).toContainEqual({key:"DATABASE_URL",status:"invalid",required:true});
  expect(r.stdout+r.stderr).not.toContain("PRIVATE_PASSWORD");
});
