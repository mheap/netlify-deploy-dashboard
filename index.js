import fs from "fs/promises";

import "dotenv/config";
import Fastify from "fastify";
import FastifyView from "@fastify/view";
import FastifyStatic from "@fastify/static";
import nunjucks from "nunjucks";

import groupBy from "lodash.groupby";
import {
  format,
  parseISO,
  eachDayOfInterval,
  subDays,
  isWeekend,
} from "date-fns";

const fastify = Fastify({
  logger: true,
});

fastify.register(FastifyView, {
  engine: {
    nunjucks,
  },
  viewExt: "njk",
  root: "./views",
});

fastify.register(FastifyStatic, {
  root: "/Users/michael/development/kong/netlify-dashboard/assets",
  prefix: "/assets/",
});

// Declare a route
fastify.get("/", async function handler(request, reply) {
  const grouping = request.query.format || "yyyy-LL-dd";
  const days = request.query.days || 30;

  let deploys = JSON.parse(await fs.readFile("./all_deploys.json", "utf8"));

  // Successful deploys only
  deploys = deploys.filter((d) => d.state == "ready");

  // Convert all `created_at` to date objects
  deploys.forEach((d) => {
    d.created_at_date = format(parseISO(d.created_at), grouping);
  });

  // Get all dates in the last X days
  const today = new Date();

  const dates = Array.from(
    new Set(
      eachDayOfInterval({
        end: today,
        start: subDays(today, days),
      })
        .filter((f) => !isWeekend(f))
        .map((d) => format(d, grouping))
    )
  );

  const productionDeploy = groupBy(
    deploys.filter((d) => d.context == "production"),
    "created_at_date"
  );

  const previewDeploy = groupBy(
    deploys.filter((d) => d.context == "deploy-preview"),
    "created_at_date"
  );

  const deployData = {
    production: [],
    preview: [],
  };

  // Populate data array for every date in interval
  dates.forEach((date) => {
    deployData.production.push(productionDeploy[date]?.length ?? 0);
    deployData.preview.push(previewDeploy[date]?.length ?? 0);
  });

  return reply.view("index", {
    dates,
    deploys: deployData,
    grouping,
    days,
  });
});

// Run the server!
try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
