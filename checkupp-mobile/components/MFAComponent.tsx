// import { useGlobalContext } from "@/context/useAuthBootstrap";
// import {
//   enrollMFA,
//   completeMFAEnrollment,
//   firebaseConfig,
// } from "@/lib/firebase/firebase";
// // import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
// import { useState, useRef } from "react";
// import { View } from "react-native";
// import CustomButton from "./CustomButton";
// import FormField from "./FormField";
// import { useToast } from "./ToastProvider";
// import React from "react";

// const SetupMFA = () => {
//   const [phoneNumber, setPhoneNumber] = useState("");
//   const [verificationId, setVerificationId] = useState("");
//   const [verificationCode, setVerificationCode] = useState("");
//   const recaptchaVerifier = useRef(null);
//   const { auth } = useGlobalContext();
//   const { showToast } = useToast();

//   const handleSendCode = async () => {
//     try {
//       const verId = await enrollMFA(
//         auth,
//         phoneNumber,
//         recaptchaVerifier.current
//       );
//       setVerificationId(verId);
//       showToast("Verification code sent to your phone", "success");
//     } catch (error: any) {
//       showToast(error.message, "error");
//     }
//   };

//   const handleVerifyCode = async () => {
//     try {
//       await completeMFAEnrollment(auth, verificationId, verificationCode);
//       showToast("MFA setup completed successfully", "success");
//     } catch (error: any) {
//       showToast(error.message, "error");
//     }
//   };

//   return (
//     <View className="p-4">
//       <FirebaseRecaptchaVerifierModal
//         ref={recaptchaVerifier}
//         firebaseConfig={firebaseConfig}
//       />

//       {!verificationId ? (
//         <>
//           <FormField
//             title="Phone Number"
//             value={phoneNumber}
//             handleChangeText={setPhoneNumber}
//             placeholder="Enter your phone number"
//             keyboardType="phone-pad"
//           />
//           <CustomButton
//             title="Send Verification Code"
//             handlePress={handleSendCode}
//             containerStyles="mt-4 bg-secondary"
//             textStyles="text-black"
//           />
//         </>
//       ) : (
//         <>
//           <FormField
//             title="Verification Code"
//             value={verificationCode}
//             handleChangeText={setVerificationCode}
//             placeholder="Enter the verification code"
//             keyboardType="number-pad"
//           />
//           <CustomButton
//             title="Verify and Enable MFA"
//             handlePress={handleVerifyCode}
//             containerStyles="mt-4 bg-secondary"
//             textStyles="text-black"
//           />
//         </>
//       )}
//     </View>
//   );
// };

// export default SetupMFA;

// import React, { useRef, useState } from 'react';
// import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
// import { firebaseConfig } from '@/lib/firebase/firebase';
// import FormField from "@/components/FormField";

// const SignIn = () => {
//   const [mfaVerificationId, setMfaVerificationId] = useState<string | null>(null);
//   const [mfaResolver, setMfaResolver] = useState<any>(null);
//   const [verificationCode, setVerificationCode] = useState('');
//   const recaptchaVerifier = useRef(null);

//   const handleSubmit = async (values: { email: string; password: string }) => {
//     setIsSubmitting(true);

//     try {
//       const mfaResult = await signInWithMFA(
//         auth,
//         values.email,
//         values.password,
//         recaptchaVerifier.current
//       );

//       if (mfaResult?.requiresMFA) {
//         setMfaVerificationId(mfaResult.verificationId);
//         setMfaResolver(mfaResult.resolver);
//         showToast("Please enter the verification code sent to your phone", "info");
//         return;
//       }

//       // Regular sign-in flow continues...
//       const appwriteUser = await getCurrentUser(auth);
//       if (!appwriteUser) {
//         showToast("User not found", "error");
//         return;
//       }

//       setUser(appwriteUser);
//       setIsLoggedIn(true);
//       router.replace("/home");
//     } catch (error: any) {
//       showToast(error.message, "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleMFAVerification = async () => {
//     if (!mfaVerificationId || !mfaResolver || !verificationCode) return;

//     setIsSubmitting(true);
//     try {
//       const user = await completeMFASignIn(
//         mfaVerificationId,
//         verificationCode,
//         mfaResolver
//       );

//       const appwriteUser = await getCurrentUser(auth);
//       if (!appwriteUser) {
//         showToast("User not found", "error");
//         return;
//       }

//       setUser(appwriteUser);
//       setIsLoggedIn(true);
//       router.replace("/home");
//     } catch (error: any) {
//       showToast(error.message, "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <GestureHandlerRootView>
//       <SafeAreaView className="bg-white h-full">
//         <FirebaseRecaptchaVerifierModal
//           ref={recaptchaVerifier}
//           firebaseConfig={firebaseConfig}
//         />

//         <KeyboardAvoidingView
//           behavior={Platform.OS === "ios" ? "padding" : "height"}
//           style={{ flex: 1 }}
//         >
//           {mfaVerificationId ? (
//             // MFA Verification Screen
//             <View className="flex-1 justify-center px-4">
//               <Text className="text-xl text-center font-pbold mb-4">
//                 Enter Verification Code
//               </Text>
//               <FormField
//                 title="Verification Code"
//                 value={verificationCode}
//                 handleChangeText={setVerificationCode}
//                 placeholder="Enter the code sent to your phone"
//                 keyboardType="number-pad"
//               />
//               <CustomButton
//                 title="Verify"
//                 handlePress={handleMFAVerification}
//                 containerStyles="mt-6 bg-secondary"
//                 textStyles="text-black"
//               />
//             </View>
//           ) : (
//             // Regular Sign In Screen (your existing code)
//             // ... rest of your sign-in form
//           )}
//         </KeyboardAvoidingView>
//       </SafeAreaView>
//     </GestureHandlerRootView>
//   );
// };

// Add these imports to your firebase.ts
// import {
//   PhoneAuthProvider,
//   PhoneMultiFactorGenerator,
//   getMultiFactorResolver,
//   multiFactor,
// } from "@firebase/auth";
// import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";

// // Add this function to check if MFA is enabled
// export const isMFAEnabled = async (auth: any) => {
//   try {
//     const user = auth.currentUser;
//     if (!user) return false;

//     const enrolledFactors = await multiFactor(user).getEnrolledFactors();
//     return enrolledFactors.length > 0;
//   } catch (error) {
//     return false;
//   }
// };

// export const signInWithEmail = async (
//   auth: any,
//   email: string,
//   password: string,
//   recaptchaVerifier?: any
// ) => {
//   try {
//     const userCredential = await signInWithEmailAndPassword(
//       auth,
//       email,
//       password
//     );

//     // Check if user has MFA enabled in their profile
//     const user = userCredential.user;
//     const hasMFA = await isMFAEnabled(auth);

//     if (!hasMFA) {
//       return { user, requiresMFA: false };
//     }

//     return { user, requiresMFA: true };
//   } catch (error: any) {
//     if (error.code === 'auth/multi-factor-auth-required') {
//       const resolver = getMultiFactorResolver(auth, error);
//       const hints = resolver.hints;

//       const phoneAuthProvider = new PhoneAuthProvider(auth);
//       const verificationId = await phoneAuthProvider.verifyPhoneNumber(
//         hints[0].phoneNumber,
//         recaptchaVerifier
//       );

//       return {
//         requiresMFA: true,
//         verificationId,
//         resolver,
//       };
//     }

//     if (error.code === "auth/invalid-credential") {
//       throw new Error("Invalid credentials! Please try again.");
//     }

//     throw new Error("An error occurred during sign-in. Please try again.");
//   }
// };

// // Function to store MFA status in your Appwrite database
// export const updateUserMFAStatus = async (userId: string, isMFAEnabled: boolean) => {
//   try {
//     await databases.updateDocument(
//       appwriteConfig.databaseId,
//       appwriteConfig.userCollectionId,
//       userId,
//       {
//         mfaEnabled: isMFAEnabled
//       }
//     );
//   } catch (error: any) {
//     throw new Error(error.message);
//   }
// };

// export const enrollMFA = async (
//   auth: any,
//   phoneNumber: string,
//   recaptchaVerifier: any
// ) => {
//   try {
//     const user = auth.currentUser;
//     const session = await multiFactor(user).getSession();

//     const phoneAuthProvider = new PhoneAuthProvider(auth);
//     const verificationId = await phoneAuthProvider.verifyPhoneNumber(
//       phoneNumber,
//       recaptchaVerifier,
//       session
//     );

//     return verificationId;
//   } catch (error: any) {
//     throw new Error(error.message);
//   }
// };

// export const completeMFAEnrollment = async (
//   auth: any,
//   verificationId: string,
//   verificationCode: string,
//   userId: string
// ) => {
//   try {
//     const user = auth.currentUser;
//     const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
//     const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credential);

//     await multiFactor(user).enroll(multiFactorAssertion, "Phone Number");

//     // Update MFA status in Appwrite
//     await updateUserMFAStatus(userId, true);

//     return true;
//   } catch (error: any) {
//     throw new Error(error.message);
//   }
// };

// export const disableMFA = async (auth: any, userId: string) => {
//   try {
//     const user = auth.currentUser;
//     const enrolledFactors = await multiFactor(user).getEnrolledFactors();

//     if (enrolledFactors.length > 0) {
//       await multiFactor(user).unenroll(enrolledFactors[0]);
//       await updateUserMFAStatus(userId, false);
//     }

//     return true;
//   } catch (error: any) {
//     throw new Error(error.message);
//   }
// };

// const SignIn = () => {
//   const [mfaVerificationId, setMfaVerificationId] = useState<string | null>(
//     null
//   );
//   const [mfaResolver, setMfaResolver] = useState<any>(null);
//   const [verificationCode, setVerificationCode] = useState("");
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const recaptchaVerifier = useRef(null);
//   const { setUser, setIsLoggedIn, auth } = useGlobalContext();
//   const { showToast } = useToast();

//   const handleSubmit = async (values: { email: string; password: string }) => {
//     setIsSubmitting(true);

//     try {
//       const signInResult = await signInWithEmail(
//         auth,
//         values.email,
//         values.password,
//         recaptchaVerifier.current
//       );

//       // If MFA is required and verification ID is provided
//       if (signInResult.verificationId && signInResult.resolver) {
//         setMfaVerificationId(signInResult.verificationId);
//         setMfaResolver(signInResult.resolver);
//         showToast(
//           "Please enter the verification code sent to your phone",
//           "info"
//         );
//         setIsSubmitting(false);
//         return;
//       }

//       // If user doesn't have MFA enabled or regular sign-in successful
//       const appwriteUser = await getCurrentUser(auth);
//       if (!appwriteUser) {
//         showToast("User not found", "error");
//         return;
//       }

//       setUser(appwriteUser);
//       setIsLoggedIn(true);
//       router.replace("/home");
//     } catch (error: any) {
//       showToast(error.message, "error");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Rest of the component remains the same...
// };

// const MFASettings = () => {
//   const [phoneNumber, setPhoneNumber] = useState("");
//   const [verificationId, setVerificationId] = useState("");
//   const [verificationCode, setVerificationCode] = useState("");
//   const [hasMFA, setHasMFA] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const recaptchaVerifier = useRef(null);
//   const { auth, user } = useGlobalContext();
//   const { showToast } = useToast();

//   useEffect(() => {
//     checkMFAStatus();
//   }, []);

//   const checkMFAStatus = async () => {
//     const mfaEnabled = await isMFAEnabled(auth);
//     setHasMFA(mfaEnabled);
//     setIsLoading(false);
//   };

//   const handleSendCode = async () => {
//     try {
//       const verId = await enrollMFA(
//         auth,
//         phoneNumber,
//         recaptchaVerifier.current
//       );
//       setVerificationId(verId);
//       showToast("Verification code sent to your phone", "success");
//     } catch (error: any) {
//       showToast(error.message, "error");
//     }
//   };

//   const handleVerifyCode = async () => {
//     try {
//       await completeMFAEnrollment(
//         auth,
//         verificationId,
//         verificationCode,
//         user.$id
//       );
//       setHasMFA(true);
//       showToast("MFA setup completed successfully", "success");
//     } catch (error: any) {
//       showToast(error.message, "error");
//     }
//   };

//   const handleDisableMFA = async () => {
//     try {
//       await disableMFA(auth, user.$id);
//       setHasMFA(false);
//       showToast("MFA has been disabled", "success");
//     } catch (error: any) {
//       showToast(error.message, "error");
//     }
//   };

//   if (isLoading) {
//     return <ButtonLoadAnimation />;
//   }

//   return (
//     <View className="p-4">
//       <FirebaseRecaptchaVerifierModal
//         ref={recaptchaVerifier}
//         firebaseConfig={firebaseConfig}
//       />

//       <Text className="text-xl font-pbold mb-4">Two-Factor Authentication</Text>

//       {hasMFA ? (
//         <View>
//           <Text className="text-green-600 font-psemibold mb-4">
//             MFA is currently enabled
//           </Text>
//           <CustomButton
//             title="Disable MFA"
//             handlePress={handleDisableMFA}
//             containerStyles="bg-red-500"
//             textStyles="text-white"
//           />
//         </View>
//       ) : !verificationId ? (
//         <>
//           <Text className="text-gray-600 mb-4">
//             Enable two-factor authentication to add an extra layer of security
//             to your account.
//           </Text>
//           <FormField
//             title="Phone Number"
//             value={phoneNumber}
//             handleChangeText={setPhoneNumber}
//             placeholder="Enter your phone number"
//             keyboardType="phone-pad"
//           />
//           <CustomButton
//             title="Send Verification Code"
//             handlePress={handleSendCode}
//             containerStyles="mt-4 bg-secondary"
//             textStyles="text-black"
//           />
//         </>
//       ) : (
//         <>
//           <FormField
//             title="Verification Code"
//             value={verificationCode}
//             handleChangeText={setVerificationCode}
//             placeholder="Enter the verification code"
//             keyboardType="number-pad"
//           />
//           <CustomButton
//             title="Verify and Enable MFA"
//             handlePress={handleVerifyCode}
//             containerStyles="mt-4 bg-secondary"
//             textStyles="text-black"
//           />
//         </>
//       )}
//     </View>
//   );
// };

//
// MFA related functions
// export const enrollMFA = async (
//   auth: any,
//   phoneNumber: string,
//   recaptchaVerifier: any
// ) => {
//   try {
//     const user = auth.currentUser;
//     const session = await multiFactor(user).getSession();

//     const phoneAuthProvider = new PhoneAuthProvider(auth);
//     const verificationId = await phoneAuthProvider.verifyPhoneNumber(
//       phoneNumber,
//       recaptchaVerifier
//     );

//     return verificationId;
//   } catch (error: any) {
//     throw new Error(error.message);
//   }
// };

// export const completeMFAEnrollment = async (
//   auth: any,
//   verificationId: string,
//   verificationCode: string
// ) => {
//   try {
//     const user = auth.currentUser;
//     const credential = PhoneAuthProvider.credential(
//       verificationId,
//       verificationCode
//     );
//     const multiFactorAssertion =
//       PhoneMultiFactorGenerator.assertion(credential);

//     await multiFactor(user).enroll(multiFactorAssertion, "Phone Number");
//     return true;
//   } catch (error: any) {
//     throw new Error(error.message);
//   }
// };

// export const signInWithMFA = async (
//   auth: any,
//   email: string,
//   password: string,
//   recaptchaVerifier: any
// ) => {
//   try {
//     await signInWithEmailAndPassword(auth, email, password);
//   } catch (error: any) {
//     if (error.code === "auth/multi-factor-auth-required") {
//       const resolver = getMultiFactorResolver(auth, error);
//       const hints = resolver.hints;

//       const phoneAuthProvider = new PhoneAuthProvider(auth);
//       const verificationId = await phoneAuthProvider.verifyPhoneNumber(
//         (hints[0] as PhoneMultiFactorInfo).phoneNumber,
//         recaptchaVerifier
//       );

//       return {
//         requiresMFA: true,
//         verificationId,
//         resolver,
//       };
//     }
//     throw error;
//   }
// };

// export const completeMFASignIn = async (
//   verificationId: string,
//   verificationCode: string,
//   resolver: any
// ) => {
//   try {
//     const credential = PhoneAuthProvider.credential(
//       verificationId,
//       verificationCode
//     );
//     const multiFactorAssertion =
//       PhoneMultiFactorGenerator.assertion(credential);
//     const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
//     return userCredential.user;
//   } catch (error: any) {
//     throw new Error(error.message);
//   }
// };
