import { ValidationStage } from '../../types/settings.types';

const validationStageConfig = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  groupBy: jest.fn(),
};

const prismaMocks = {
  prisma: {
    validationStageConfig,
    $transaction: jest.fn(async (cb: (tx: any) => unknown) => {
      return cb({ validationStageConfig });
    }),
  },
  validationStageConfig,
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMocks.prisma),
  ValidationStageConfig: class {},
}));

describe('validation-stage-config.service', () => {
  let service: typeof import('../../services/validation-stage-config.service');

  const resetMocks = () => {
    for (const fn of Object.values(prismaMocks.validationStageConfig)) {
      (fn as jest.Mock).mockReset();
    }
    prismaMocks.prisma.$transaction.mockReset();
  };

  beforeEach(() => {
    jest.resetModules();
    resetMocks();
    service = require('../../services/validation-stage-config.service');
  });

  const sampleStage = {
    id: '1',
    stageId: 'lint',
    name: 'Lint',
    command: 'npm run lint',
    timeout: 30000,
    enabled: true,
    continueOnFailure: false,
    priority: 1,
    description: null,
    environment: null,
    category: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('returns validation stages for execution sorted by priority', async () => {
    prismaMocks.validationStageConfig.findMany.mockResolvedValue([sampleStage]);
    const stages = await service.getValidationStagesForExecution();
    expect(stages).toEqual([
      expect.objectContaining({
        id: 'lint',
        name: 'Lint',
        priority: 1,
      }),
    ]);
    expect(prismaMocks.validationStageConfig.findMany).toHaveBeenCalledWith({
      orderBy: { priority: 'asc' },
    });
  });

  it('fetches only enabled stages', async () => {
    prismaMocks.validationStageConfig.findMany.mockResolvedValue([sampleStage]);
    const stages = await service.getEnabledValidationStages();
    expect(stages[0].enabled).toBe(true);
    expect(prismaMocks.validationStageConfig.findMany).toHaveBeenCalledWith({
      where: { enabled: true },
      orderBy: { priority: 'asc' },
    });
  });

  it('returns stage by ID or null', async () => {
    prismaMocks.validationStageConfig.findUnique
      .mockResolvedValueOnce(sampleStage)
      .mockResolvedValueOnce(null);

    const found = await service.getValidationStageById('lint');
    expect(found).toEqual(expect.objectContaining({ id: 'lint' }));

    const missing = await service.getValidationStageById('missing');
    expect(missing).toBeNull();
  });

  it('creates, updates, deletes and toggles validation stages', async () => {
    prismaMocks.validationStageConfig.create.mockResolvedValue(sampleStage);
    prismaMocks.validationStageConfig.update.mockResolvedValue({ ...sampleStage, enabled: false });
    prismaMocks.validationStageConfig.findUnique.mockResolvedValue(sampleStage);
    prismaMocks.validationStageConfig.delete.mockResolvedValue(undefined);

    await service.createValidationStage(sampleStage as any);
    expect(prismaMocks.validationStageConfig.create).toHaveBeenCalledWith({ data: sampleStage });

    await service.updateValidationStage('lint', { command: 'npm run lint -- --fix' });
    expect(prismaMocks.validationStageConfig.update).toHaveBeenCalledWith({
      where: { stageId: 'lint' },
      data: { command: 'npm run lint -- --fix' },
    });

    await service.deleteValidationStage('lint');
    expect(prismaMocks.validationStageConfig.delete).toHaveBeenCalledWith({
      where: { stageId: 'lint' },
    });

    await service.toggleValidationStage('lint');
    expect(prismaMocks.validationStageConfig.update).toHaveBeenCalledWith({
      where: { stageId: 'lint' },
      data: { enabled: false },
    });
  });

  it('reorders validation stages inside a transaction', async () => {
    prismaMocks.validationStageConfig.findMany.mockResolvedValue([sampleStage]);
    const transactionUpdate = jest.fn().mockResolvedValue(sampleStage);
    prismaMocks.prisma.$transaction.mockImplementation(async cb =>
      cb({ validationStageConfig: { update: transactionUpdate } })
    );

    const stages = await service.reorderValidationStages([
      { stageId: 'lint', priority: 2 },
    ]);

    expect(prismaMocks.prisma.$transaction).toHaveBeenCalled();
    expect(transactionUpdate).toHaveBeenCalledWith({
      where: { stageId: 'lint' },
      data: { priority: 2 },
    });
    expect(stages).toEqual([sampleStage]);
  });

  it('calculates validation stage statistics', async () => {
    prismaMocks.validationStageConfig.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3);
    prismaMocks.validationStageConfig.groupBy.mockResolvedValue([
      { category: 'lint', _count: { id: 2 } },
      { category: null, _count: { id: 1 } },
    ]);

    const stats = await service.getValidationStageStats();

    expect(stats).toEqual({
      total: 5,
      enabled: 3,
      disabled: 2,
      byCategory: { lint: 2, other: 1 },
    });
  });

  it('performs health check and returns ok', async () => {
    prismaMocks.validationStageConfig.count.mockResolvedValueOnce(7);
    const result = await service.healthCheck();
    expect(result).toEqual({ status: 'ok', stageCount: 7 });
  });

  it('handles health check errors gracefully', async () => {
    prismaMocks.validationStageConfig.count.mockRejectedValueOnce(new Error('db down'));
    const result = await service.healthCheck();
    expect(result.status).toBe('error');
    expect(result.message).toBe('db down');
  });

  it('propagates errors when fetching validation stages for execution', async () => {
    prismaMocks.validationStageConfig.findMany.mockRejectedValueOnce(new Error('db fail'));

    await expect(service.getValidationStagesForExecution()).rejects.toThrow(
      'Failed to fetch validation stage configurations'
    );
  });

  it('propagates errors when fetching enabled validation stages', async () => {
    prismaMocks.validationStageConfig.findMany.mockRejectedValueOnce(new Error('db fail'));

    await expect(service.getEnabledValidationStages()).rejects.toThrow(
      'Failed to fetch enabled validation stage configurations'
    );
  });

  it('handles errors when looking up validation stages by id', async () => {
    prismaMocks.validationStageConfig.findUnique.mockRejectedValueOnce(new Error('timeout'));

    await expect(service.getValidationStageById('lint')).rejects.toThrow(
      'Failed to fetch validation stage configuration: lint'
    );
  });

  it('handles create/update/delete failures gracefully', async () => {
    prismaMocks.validationStageConfig.create.mockRejectedValueOnce(new Error('insert failed'));
    await expect(service.createValidationStage(sampleStage as any)).rejects.toThrow(
      'Failed to create validation stage configuration'
    );

    prismaMocks.validationStageConfig.update.mockRejectedValueOnce(new Error('update failed'));
    await expect(service.updateValidationStage('lint', { command: 'npm run lint' })).rejects.toThrow(
      'Failed to update validation stage configuration: lint'
    );

    prismaMocks.validationStageConfig.delete.mockRejectedValueOnce(new Error('delete failed'));
    await expect(service.deleteValidationStage('lint')).rejects.toThrow(
      'Failed to delete validation stage configuration: lint'
    );
  });

  it('throws when toggling a missing validation stage', async () => {
    prismaMocks.validationStageConfig.findUnique.mockResolvedValueOnce(null);

    await expect(service.toggleValidationStage('missing-stage')).rejects.toThrow(
      'Failed to toggle validation stage configuration: missing-stage'
    );
  });

  it('handles toggle update failures', async () => {
    prismaMocks.validationStageConfig.findUnique.mockResolvedValueOnce(sampleStage);
    prismaMocks.validationStageConfig.update.mockRejectedValueOnce(new Error('toggle failed'));

    await expect(service.toggleValidationStage('lint')).rejects.toThrow(
      'Failed to toggle validation stage configuration: lint'
    );
  });

  it('handles reorder failures inside transaction', async () => {
    prismaMocks.prisma.$transaction.mockRejectedValueOnce(new Error('tx failed'));

    await expect(
      service.reorderValidationStages([
        { stageId: 'lint', priority: 3 },
      ])
    ).rejects.toThrow('Failed to reorder validation stage configurations');
  });

  it('handles stats aggregation failures', async () => {
    prismaMocks.validationStageConfig.count.mockRejectedValueOnce(new Error('count failed'));

    await expect(service.getValidationStageStats()).rejects.toThrow(
      'Failed to fetch validation stage statistics'
    );
  });
});
