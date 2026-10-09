import { Router, Response } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../auth.middleware.js';
import { getPrisma, dbService } from '../db.js';

export const customModulesRouter = Router();

// Helper to check admin
function checkIsAdmin(user: any): boolean {
  const role = (user?.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERADMIN';
}

// --------------------------------------------------------------------------
// 1. PUBLIC / AUTHENTICATED: Get all active custom modules for navigation
// --------------------------------------------------------------------------
customModulesRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const isAdmin = checkIsAdmin(req.user);

  try {
    const modules = await prisma.customModule.findMany({
      where: isAdmin ? {} : { status: 'ACTIVE' },
      include: {
        fields: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      success: true,
      modules
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// 2. ADMIN ONLY: Create a new custom module with fields
// --------------------------------------------------------------------------
customModulesRouter.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const adminId = req.userId!;
  const { name, slug, description, icon, fields, isPublic, status } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ success: false, message: 'Tên module không được để trống.' });
    return;
  }

  const cleanSlug = (slug || name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 40);

  try {
    const existing = await prisma.customModule.findUnique({
      where: { slug: cleanSlug }
    });

    if (existing) {
      res.status(400).json({ success: false, message: `Mã định danh slug '${cleanSlug}' đã tồn tại.` });
      return;
    }

    const createdModule = await prisma.customModule.create({
      data: {
        name: String(name).trim(),
        slug: cleanSlug,
        description: description ? String(description).trim() : null,
        icon: icon || 'Layers',
        status: status || 'ACTIVE',
        isPublic: Boolean(isPublic),
        fields: {
          create: (Array.isArray(fields) ? fields : []).map((f: any, idx: number) => ({
            name: String(f.name || `Trường ${idx + 1}`).trim(),
            key: String(f.key || `field_${idx + 1}`).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            type: f.type || 'text',
            required: Boolean(f.required),
            defaultValue: f.defaultValue ? String(f.defaultValue) : null,
            options: typeof f.options === 'string' ? f.options : JSON.stringify(f.options || []),
            sortOrder: typeof f.sortOrder === 'number' ? f.sortOrder : idx
          }))
        }
      },
      include: {
        fields: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    await dbService.createAuditLog(
      adminId,
      'ADMIN_CREATE_CUSTOM_MODULE',
      'custom_modules',
      createdModule.id,
      null,
      { name: createdModule.name, slug: createdModule.slug, fieldsCount: createdModule.fields.length }
    );

    res.json({
      success: true,
      message: `Đã khởi tạo module "${createdModule.name}" thành công!`,
      module: createdModule
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// 3. ADMIN ONLY: Update custom module & its fields
// --------------------------------------------------------------------------
customModulesRouter.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const adminId = req.userId!;
  const moduleId = req.params.id;
  const { name, description, icon, status, isPublic, fields } = req.body;

  try {
    const existing = await prisma.customModule.findUnique({
      where: { id: moduleId },
      include: { fields: true }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Không tìm thấy module này.' });
      return;
    }

    // Execute update in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update module info
      const mod = await tx.customModule.update({
        where: { id: moduleId },
        data: {
          ...(name && { name: String(name).trim() }),
          ...(description !== undefined && { description: String(description).trim() }),
          ...(icon && { icon: String(icon) }),
          ...(status && { status: String(status) }),
          ...(isPublic !== undefined && { isPublic: Boolean(isPublic) })
        }
      });

      // 2. If fields array provided, sync fields
      if (Array.isArray(fields)) {
        await tx.customModuleField.deleteMany({
          where: { moduleId }
        });

        await tx.customModuleField.createMany({
          data: fields.map((f: any, idx: number) => ({
            moduleId,
            name: String(f.name || `Trường ${idx + 1}`).trim(),
            key: String(f.key || `field_${idx + 1}`).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            type: f.type || 'text',
            required: Boolean(f.required),
            defaultValue: f.defaultValue ? String(f.defaultValue) : null,
            options: typeof f.options === 'string' ? f.options : JSON.stringify(f.options || []),
            sortOrder: typeof f.sortOrder === 'number' ? f.sortOrder : idx
          }))
        });
      }

      return await tx.customModule.findUnique({
        where: { id: moduleId },
        include: { fields: { orderBy: { sortOrder: 'asc' } } }
      });
    });

    await dbService.createAuditLog(
      adminId,
      'ADMIN_UPDATE_CUSTOM_MODULE',
      'custom_modules',
      moduleId,
      existing,
      updated
    );

    res.json({
      success: true,
      message: 'Cập nhật module thành công!',
      module: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// 4. ADMIN ONLY: Delete custom module
// --------------------------------------------------------------------------
customModulesRouter.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const adminId = req.userId!;
  const moduleId = req.params.id;

  try {
    const existing = await prisma.customModule.findUnique({
      where: { id: moduleId }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Không tìm thấy module này.' });
      return;
    }

    await prisma.customModule.delete({
      where: { id: moduleId }
    });

    await dbService.createAuditLog(
      adminId,
      'ADMIN_DELETE_CUSTOM_MODULE',
      'custom_modules',
      moduleId,
      existing,
      null
    );

    res.json({
      success: true,
      message: `Đã xóa module "${existing.name}" cùng toàn bộ dữ liệu liên quan.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. RUNTIME: Get module definition and records by slug
// --------------------------------------------------------------------------
customModulesRouter.get('/:slug/records', requireAuth, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const { slug } = req.params;
  const userId = req.userId!;
  const isAdmin = checkIsAdmin(req.user);
  const search = (req.query.search as string) || '';

  try {
    const moduleItem = await prisma.customModule.findUnique({
      where: { slug },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } }
      }
    });

    if (!moduleItem) {
      res.status(404).json({ success: false, message: `Không tìm thấy module với mã '${slug}'.` });
      return;
    }

    // Non-admins can only view their own records
    const records = await prisma.customModuleRecord.findMany({
      where: {
        moduleId: moduleItem.id,
        ...(isAdmin ? {} : { userId })
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      module: moduleItem,
      records
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// 6. RUNTIME: Create a new record in custom module
// --------------------------------------------------------------------------
customModulesRouter.post('/:slug/records', requireAuth, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const { slug } = req.params;
  const userId = req.userId!;
  const rawData = req.body.data || req.body;

  try {
    const moduleItem = await prisma.customModule.findUnique({
      where: { slug },
      include: { fields: true }
    });

    if (!moduleItem) {
      res.status(404).json({ success: false, message: `Không tìm thấy module '${slug}'.` });
      return;
    }

    // Validate required fields
    for (const field of moduleItem.fields) {
      if (field.required && (rawData[field.key] === undefined || rawData[field.key] === null || rawData[field.key] === '')) {
        res.status(400).json({
          success: false,
          message: `Trường bắt buộc "${field.name}" không được để trống.`
        });
        return;
      }
    }

    const createdRecord = await prisma.customModuleRecord.create({
      data: {
        moduleId: moduleItem.id,
        userId,
        data: rawData
      }
    });

    res.json({
      success: true,
      message: 'Thêm bản ghi mới thành công!',
      record: createdRecord
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// 7. RUNTIME: Update a record in custom module
// --------------------------------------------------------------------------
customModulesRouter.put('/:slug/records/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const { slug, id } = req.params;
  const userId = req.userId!;
  const isAdmin = checkIsAdmin(req.user);
  const rawData = req.body.data || req.body;

  try {
    const existing = await prisma.customModuleRecord.findUnique({
      where: { id }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi này.' });
      return;
    }

    // Ownership check
    if (!isAdmin && existing.userId !== userId) {
      res.status(403).json({ success: false, message: 'Bạn không có quyền sửa bản ghi này.' });
      return;
    }

    const currentData = (typeof existing.data === 'object' && existing.data !== null) ? existing.data as Record<string, any> : {};
    const mergedData = { ...currentData, ...rawData };

    const updated = await prisma.customModuleRecord.update({
      where: { id },
      data: {
        data: mergedData
      }
    });

    res.json({
      success: true,
      message: 'Cập nhật bản ghi thành công!',
      record: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------------------------------------------------------------
// 8. RUNTIME: Delete a record in custom module
// --------------------------------------------------------------------------
customModulesRouter.delete('/:slug/records/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const { id } = req.params;
  const userId = req.userId!;
  const isAdmin = checkIsAdmin(req.user);

  try {
    const existing = await prisma.customModuleRecord.findUnique({
      where: { id }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi này.' });
      return;
    }

    if (!isAdmin && existing.userId !== userId) {
      res.status(403).json({ success: false, message: 'Bạn không có quyền xóa bản ghi này.' });
      return;
    }

    await prisma.customModuleRecord.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Đã xóa bản ghi thành công!'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
