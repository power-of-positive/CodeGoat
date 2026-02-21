import { promises as fs } from 'fs';
import path from 'path';
import { getDMMF } from '@prisma/internals';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'prisma', 'schema.prisma');
const GENERATED_DIR = path.join(REPO_ROOT, 'src', 'types', 'generated');
const ENUMS_OUTPUT = path.join(GENERATED_DIR, 'prisma-enums.ts');
const FIELD_MAPPINGS_OUTPUT = path.join(GENERATED_DIR, 'prisma-field-mappings.ts');

const AUTO_GEN_BANNER = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Run \`npm run generate:prisma-enums\` after changing prisma/schema.prisma.
`;

const toConstantKey = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();

async function generateEnums() {
  const schema = await fs.readFile(SCHEMA_PATH, 'utf8');
  const dmmf = await getDMMF({ datamodel: schema });

  const enumBlocks = dmmf.datamodel.enums.map(prismaEnum => {
    const entries = prismaEnum.values
      .map(value => `  ${toConstantKey(value.name)}: '${value.name}',`)
      .join('\n');

    return `export const ${prismaEnum.name} = {\n${entries}\n} as const;\n\nexport type ${prismaEnum.name}Type = (typeof ${prismaEnum.name})[keyof typeof ${prismaEnum.name}];\n`;
  });

  const enumsFileContents = `${AUTO_GEN_BANNER}\n${enumBlocks.join('\n')}`.trimEnd() + '\n';

  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.writeFile(ENUMS_OUTPUT, enumsFileContents, 'utf8');
}

async function generateFieldMappings() {
  const schema = await fs.readFile(SCHEMA_PATH, 'utf8');
  const dmmf = await getDMMF({ datamodel: schema });

  const modelMappings = dmmf.datamodel.models
    .map(model => {
      const fieldMappings = model.fields
        .filter(field => field.dbName && field.dbName !== field.name)
        .map(field => `    ${field.name}: '${field.dbName}',`)
        .join('\n');

      if (!fieldMappings) {
        return '';
      }

      const tableName = model.dbName ?? model.name;

      return `  ${model.name}: {\n    __table: '${tableName}',\n${fieldMappings}\n  },`;
    })
    .filter(Boolean)
    .join('\n');

  const content = `${AUTO_GEN_BANNER}
export const PrismaFieldMappings = {
${modelMappings}
} as const;

export type PrismaFieldMappingsType = typeof PrismaFieldMappings;
`.trimEnd() + '\n';

  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.writeFile(FIELD_MAPPINGS_OUTPUT, content, 'utf8');
}

async function main() {
  await generateEnums();
  await generateFieldMappings();
}

main().catch(error => {
  console.error('Failed to generate Prisma enums and mappings:', error);
  process.exit(1);
});
