import "dotenv/config";

import { NetlifyAPI } from "netlify";
const client = new NetlifyAPI(process.env.NETLIFY_TOKEN);

let deploys = [];
let page = 1;

// Fetch 50000 deploys by default
const maxPages = 5000;

let newDeploys;
do {
  newDeploys = await client.listSiteDeploys({
    site_id: process.env.NETLIFY_SITE_ID,
    page,
    per_page: 100,
  });

  deploys = deploys.concat(
    newDeploys.map((d) => {
      return {
        id: d.id,
        title: d.title,
        state: d.state,
        context: d.context,
        committer: d.committer,
        created_at: d.created_at,
        updated_at: d.updated_at,
      };
    })
  );

  page++;
} while (newDeploys.length > 0 && page <= maxPages);

console.log(JSON.stringify(deploys));
