import { prisma } from '../../config/database';
import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { formatSequenceCode } from '../../common/utils/sequenceCode';
import { recordAudit } from '../../middlewares/auditLog.middleware';
import type {
  AddPatientDocumentInput,
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from './patient.validation';

function computeAge(
  dateOfBirth: Date | undefined,
  fallbackAge: number | undefined,
): number | undefined {
  if (!dateOfBirth) return fallbackAge;
  const diffMs = Date.now() - dateOfBirth.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

export function toPatientCode(patientNumber: number): string {
  return formatSequenceCode('PT', patientNumber);
}

function withPatientCode<T extends { patientNumber: number }>(
  patient: T,
): T & { patientCode: string } {
  return { ...patient, patientCode: toPatientCode(patient.patientNumber) };
}

export async function createPatient(input: CreatePatientInput, createdById: string) {
  const existing = await prisma.patient.findUnique({ where: { mobileNumber: input.mobileNumber } });
  if (existing) {
    throw new ConflictError('A patient with this mobile number already exists');
  }

  const patient = await prisma.patient.create({
    data: {
      ...input,
      age: computeAge(input.dateOfBirth, input.age),
      createdById,
    },
  });

  await recordAudit({
    userId: createdById,
    action: 'PATIENT_CREATED',
    resource: 'Patient',
    resourceId: patient.id,
  });

  return withPatientCode(patient);
}

export async function getPatientById(id: string) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) throw new NotFoundError('Patient not found');
  return withPatientCode(patient);
}

export async function listPatients(query: ListPatientsQuery) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.city ? { city: query.city } : {}),
    ...(query.state ? { state: query.state } : {}),
    ...(query.search
      ? {
          OR: [
            { fullName: { contains: query.search } },
            { mobileNumber: { contains: query.search } },
            { email: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    items: items.map(withPatientCode),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}

export async function updatePatient(id: string, input: UpdatePatientInput, actingUserId: string) {
  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Patient not found');

  if (input.mobileNumber && input.mobileNumber !== existing.mobileNumber) {
    const conflict = await prisma.patient.findUnique({
      where: { mobileNumber: input.mobileNumber },
    });
    if (conflict) throw new ConflictError('A patient with this mobile number already exists');
  }

  const updated = await prisma.patient.update({
    where: { id },
    data: {
      ...input,
      age: computeAge(input.dateOfBirth, input.age ?? existing.age ?? undefined),
    },
  });

  await recordAudit({
    userId: actingUserId,
    action: 'PATIENT_UPDATED',
    resource: 'Patient',
    resourceId: id,
    metadata: { changes: input },
  });

  return withPatientCode(updated);
}

export async function addPatientDocument(
  patientId: string,
  input: AddPatientDocumentInput,
  uploadedById: string,
) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Patient not found');

  const document = await prisma.patientDocument.create({
    data: { ...input, patientId, uploadedById },
  });

  await recordAudit({
    userId: uploadedById,
    action: 'PATIENT_DOCUMENT_ADDED',
    resource: 'PatientDocument',
    resourceId: document.id,
    metadata: { patientId, type: input.type },
  });

  return document;
}

export async function listPatientDocuments(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true },
  });
  if (!patient) throw new NotFoundError('Patient not found');

  return prisma.patientDocument.findMany({
    where: { patientId },
    orderBy: { uploadedAt: 'desc' },
  });
}
