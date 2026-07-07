export const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || "",
  platform: process.env.EXPO_PUBLIC_APPWRITE_PLATFORM || "",
  storageId: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_ID || "",
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "",
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "",
  userCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_COLLECTION_ID || "",
  fileCollectionId: process.env.EXPO_PUBLIC_APPWRITE_FILE_COLLECTION_ID || "",
  feedbackCollectionId: process.env.EXPO_PUBLIC_APPWRITE_FEEDBACK_COLLECTION_ID || "",
  nutritionCollectionId: process.env.EXPO_PUBLIC_APPWRITE_NUTRITION_COLLECTION_ID || "",
  pediatricCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PEDIATRIC_COLLECTION_ID || "",
  pregPlannerCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PREG_PLANNER_COLLECTION_ID || "",
  preEmploymentCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_PRE_EMPLOYMENT_COLLECTION_ID || "",
  cancerScreeningCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_CANCER_SCREENING_COLLECTION_ID || "",
};

// Legacy compatibility shim kept while the appwrite namespace is being phased out.
export const ID = {
  unique: () => `legacy_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
};

export const Query = {};

export class AppwriteException extends Error {}

export const OAuthProvider = {
  GOOGLE: "google",
} as const;

export const client = null;
export const account = null;
export const avatars = null;
export const databases = null;
export const storage = null;
export const messaging = null;
