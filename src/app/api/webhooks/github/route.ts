import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

const TASK_ID_REGEX = /([A-Z]{2,10})-(\d+)/g;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const event = req.headers.get("x-github-event");
  const deliveryId = req.headers.get("x-github-delivery");

  if (!event || !deliveryId) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  try {
    switch (event) {
      case "pull_request": {
        const pr = body.pull_request;
        const repoFullName = body.repository.full_name;
        const title = pr.title || "";
        const branchName = pr.head?.ref || "";
        const searchText = `${title} ${branchName} ${pr.body || ""}`;

        const taskRefs = [...searchText.matchAll(TASK_ID_REGEX)];

        for (const match of taskRefs) {
          const prefix = match[1];
          const number = parseInt(match[2], 10);

          const task = await db.task.findFirst({
            where: {
              number,
              project: { taskPrefix: prefix },
            },
            include: {
              project: {
                include: {
                  githubLinks: { where: { repoFullName } },
                },
              },
            },
          });

          if (!task) continue;

          await db.gitHubTaskLink.upsert({
            where: {
              id: `gh-pr-${pr.id}-${task.id}`,
            },
            create: {
              id: `gh-pr-${pr.id}-${task.id}`,
              taskId: task.id,
              repoFullName,
              linkType: "PULL_REQUEST",
              externalId: String(pr.id),
              externalUrl: pr.html_url,
              statusCache: {
                state: pr.state,
                merged: pr.merged,
                draft: pr.draft,
                reviewers: pr.requested_reviewers?.map((r: { login: string }) => r.login) ?? [],
              },
              lastSyncedAt: new Date(),
            },
            update: {
              statusCache: {
                state: pr.state,
                merged: pr.merged,
                draft: pr.draft,
                reviewers: pr.requested_reviewers?.map((r: { login: string }) => r.login) ?? [],
              },
              lastSyncedAt: new Date(),
            },
          });

          const syncRules = task.project.githubLinks[0]?.syncRules as Record<string, string> | undefined;
          if (syncRules) {
            if (body.action === "opened" && syncRules.on_pr_opened) {
              const targetStatus = await db.statusDefinition.findFirst({
                where: { projectId: task.projectId, name: syncRules.on_pr_opened },
              });
              if (targetStatus) {
                await db.task.update({
                  where: { id: task.id },
                  data: { statusId: targetStatus.id },
                });
              }
            }

            if (pr.merged && syncRules.on_pr_merged) {
              const targetStatus = await db.statusDefinition.findFirst({
                where: { projectId: task.projectId, name: syncRules.on_pr_merged },
              });
              if (targetStatus) {
                await db.task.update({
                  where: { id: task.id },
                  data: { statusId: targetStatus.id },
                });
              }
            }
          }
        }
        break;
      }

      case "push": {
        const commits = body.commits || [];
        const repoFullName = body.repository.full_name;

        for (const commit of commits) {
          const message = commit.message || "";
          const taskRefs = [...message.matchAll(TASK_ID_REGEX)];

          for (const match of taskRefs) {
            const prefix = match[1];
            const number = parseInt(match[2], 10);

            const task = await db.task.findFirst({
              where: {
                number,
                project: { taskPrefix: prefix },
              },
            });

            if (!task) continue;

            await db.gitHubTaskLink.create({
              data: {
                taskId: task.id,
                repoFullName,
                linkType: "COMMIT",
                externalId: commit.id,
                externalUrl: commit.url,
                statusCache: { message: commit.message, author: commit.author?.name },
                lastSyncedAt: new Date(),
              },
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("GitHub webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
