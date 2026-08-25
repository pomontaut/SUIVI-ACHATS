import { Router } from "express";

// Minimal shape shared by every Prisma model delegate we expose over REST.
interface CrudDelegate<T> {
  findMany(args?: { orderBy?: { createdAt: "asc" | "desc" } }): Promise<T[]>;
  create(args: { data: any }): Promise<T>;
  update(args: { where: { id: string }; data: any }): Promise<T>;
  delete(args: { where: { id: string } }): Promise<T>;
}

/**
 * Builds a generic REST router (list/create/update/delete) for a Prisma
 * model. Every module (opérationnel, transverse, todo, ...) has the same
 * shape of interaction, so we avoid repeating this five times.
 */
export function crudRouter<T>(delegate: CrudDelegate<T>, options?: { beforeList?: () => Promise<void> }): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    if (options?.beforeList) await options.beforeList();
    const rows = await delegate.findMany({ orderBy: { createdAt: "asc" } });
    res.json(rows);
  });

  router.post("/", async (req, res) => {
    const row = await delegate.create({ data: req.body });
    res.status(201).json(row);
  });

  router.put("/:id", async (req, res) => {
    const { id, createdAt, updatedAt, ...data } = req.body;
    const row = await delegate.update({ where: { id: req.params.id }, data });
    res.json(row);
  });

  router.delete("/:id", async (req, res) => {
    await delegate.delete({ where: { id: req.params.id } });
    res.status(204).end();
  });

  return router;
}
