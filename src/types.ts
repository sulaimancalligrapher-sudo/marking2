export interface StudentSubmission {
  studentId: string | number;
  studentName: string;
  lessonNumber: string | number;
  imageSubmissionCount: number;
  imageFileId: string | null;
  imageMimeType: string | null;
  audioSubmissionCount: number;
  audioFileId: string | null;
  audioMimeType: string | null;
  additionalT: string;
  additionalU: string;
  additionalV: string;
  additionalW: string;
  additionalX: string;
  additionalY: string;
  row: number;
  isSaved: boolean;
}

export interface User {
  username: string;
  password?: string;
  status: string;
}

export interface PredefinedText {
  title: string;
  phrase: string;
}

export interface WatermarkSettings {
  logoUrl: string;
  opacity: number;
  sizeFactor: number;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  textPrefix: string;
  fontSize: number;
  textPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

export interface SavedCorrectionData {
  notes: string;
  imageGrade: string;
  modifiedImage: string;
  audioGrade: string;
  additionalImage: string;
  video: string;
  audio: string;
}

export interface SocialLinks {
  facebook: string;
  instagram: string;
  youtube: string;
  line: string;
}

export interface AppProfile {
  logoUrl: string;
  title: string;
  subtitle: string;
}

export interface InitialData {
  profile: AppProfile;
  social: SocialLinks;
}
