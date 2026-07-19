import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as patientService from './patient.service';
import type {
  AddPatientDocumentInput,
  CreatePatientInput,
  IdParam,
  ListPatientsQuery,
  UpdatePatientInput,
} from './patient.validation';

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreatePatientInput;
  const patient = await patientService.createPatient(input, req.user!.id);
  res.status(201).json({ data: patient });
});

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const patient = await patientService.getPatientById(id);
  res.status(200).json({ data: patient });
});

export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListPatientsQuery;
  const result = await patientService.listPatients(query);
  res.status(200).json({ data: result.items, pagination: result.pagination });
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as UpdatePatientInput;
  const patient = await patientService.updatePatient(id, input, req.user!.id);
  res.status(200).json({ data: patient });
});

export const addPatientDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const input = req.body as AddPatientDocumentInput;
  const document = await patientService.addPatientDocument(id, input, req.user!.id);
  res.status(201).json({ data: document });
});

export const listPatientDocuments = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const documents = await patientService.listPatientDocuments(id);
  res.status(200).json({ data: documents });
});
