import { getEnabledSeeds, listRegisteredSeeds, runIngestion } from "@/ingestion/run";

async function main() {
  const requestedSeeds = process.argv.slice(2);
  const summary = await runIngestion(requestedSeeds);

  console.log(JSON.stringify({
    seeds: requestedSeeds.length ? requestedSeeds : getEnabledSeeds().map((seed) => seed.id),
    availableSeeds: listRegisteredSeeds().map((seed) => seed.id),
    ...summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
