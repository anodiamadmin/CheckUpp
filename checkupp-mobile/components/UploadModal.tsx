import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
  Image,
  StyleSheet,
  Dimensions,
  PixelRatio,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  AntDesign,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

// Responsive scaling
const scale = (size: number) => (width / 350) * size;
const verticalScale = (size: number) => (height / 680) * size;
const moderateScale = (size: number, factor = 0.25) =>
  size + (scale(size) - size) * factor;

// Font scaling
const getFontSize = (size: number) => {
  const pixelRatio = PixelRatio.get();
  if (width < 320) return moderateScale(size, 0.15);
  if (width < 350) return moderateScale(size, 0.18);
  if (width >= 768) return moderateScale(size, 0.35);
  if (pixelRatio >= 3) return moderateScale(size, 0.2);
  if (pixelRatio >= 2) return moderateScale(size, 0.22);
  return moderateScale(size, 0.25);
};

// Device detection
const isTablet = width >= 768;
const isSmallDevice = width < 350 || height < 600;
const isVerySmallDevice = width < 320;

// Responsive spacing
const getSpacing = (size: number) => {
  if (isVerySmallDevice) return verticalScale(size * 0.4);
  if (isSmallDevice) return verticalScale(size * 0.5);
  if (isTablet) return verticalScale(size * 1.1);
  return verticalScale(size * 0.7);
};

type FileForm = {
  title: string;
  file: { uri: string } | null;
  documentType: string;
  fileType: string;
  link?: string;
};

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  form: FileForm;
  setForm: (form: FileForm) => void;
  uploading: boolean;
  onSubmit: () => void;
  onUploadDocument: () => void;
}

const DocumentTypeCard = ({
  type,
  icon,
  isSelected,
  onPress,
}: {
  type: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    className={`flex-1 rounded-lg border ${
      isSelected ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"
    }`}
    style={{
      paddingVertical: getSpacing(12),
      paddingHorizontal: scale(8),
      marginHorizontal: scale(2),
      shadowColor: isSelected ? "#FF9C01" : "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isSelected ? 0.1 : 0.05,
      shadowRadius: 2,
      elevation: isSelected ? 2 : 1,
    }}
  >
    <View className="items-center">
      <View
        className={`rounded-full items-center justify-center ${
          isSelected ? "bg-orange-100" : "bg-gray-100"
        }`}
        style={{
          width: scale(32),
          height: scale(32),
          marginBottom: getSpacing(6),
        }}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={scale(16)}
          color={isSelected ? "#FF9C01" : "#6B7280"}
        />
      </View>
      <Text
        className={`font-pmedium text-center ${
          isSelected ? "text-orange-700" : "text-gray-600"
        }`}
        style={{ fontSize: getFontSize(11) }}
        numberOfLines={2}
      >
        {type}
      </Text>
    </View>
  </TouchableOpacity>
);

const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  onClose,
  form,
  setForm,
  uploading,
  onSubmit,
  onUploadDocument,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View className="flex-1 justify-end">
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{
                maxHeight: height * 0.85,
                minHeight: height * 0.5,
              }}
            >
              <View className="bg-white rounded-t-3xl shadow-2xl">
                {/* Header */}
                <View className="bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
                  <View
                    className="bg-gray-300 rounded-full mx-auto"
                    style={{
                      width: scale(32),
                      height: scale(3),
                      marginTop: getSpacing(6),
                      marginBottom: getSpacing(4),
                    }}
                  />

                  <View
                    className="flex-row justify-between items-center"
                    style={{
                      paddingHorizontal: scale(20),
                      paddingBottom: getSpacing(12),
                    }}
                  >
                    <View>
                      <Text
                        className="font-pmedium text-gray-500"
                        style={{
                          fontSize: getFontSize(9),
                          marginBottom: verticalScale(2),
                        }}
                      >
                        Upload New
                      </Text>
                      <Text
                        className="font-pmedium text-gray-900"
                        style={{ fontSize: getFontSize(16) }}
                      >
                        Document
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={onClose}
                      className="items-center justify-center rounded-full bg-gray-100"
                      style={{
                        width: scale(32),
                        height: scale(32),
                      }}
                    >
                      <AntDesign
                        name="close"
                        size={scale(16)}
                        color="#4B5563"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Content */}
                <ScrollView
                  style={{
                    paddingHorizontal: scale(20),
                    paddingVertical: getSpacing(16),
                    maxHeight: height * 0.6,
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Title Input */}
                  <View
                    className="bg-white rounded-lg border border-gray-100"
                    style={{
                      padding: scale(12),
                      marginBottom: getSpacing(16),
                    }}
                  >
                    <View
                      className="flex-row items-center"
                      style={{ marginBottom: getSpacing(6) }}
                    >
                      <MaterialIcons
                        name="drive-file-rename-outline"
                        size={scale(16)}
                        color="#4B5563"
                      />
                      <Text
                        className="font-pmedium text-gray-700"
                        style={{
                          fontSize: getFontSize(12),
                          marginLeft: scale(6),
                        }}
                      >
                        Document Title
                      </Text>
                    </View>
                    <TextInput
                      value={form.title}
                      onChangeText={(text) => setForm({ ...form, title: text })}
                      placeholder="Give your document a title..."
                      placeholderTextColor="#9CA3AF"
                      className="font-pmedium text-gray-900"
                      style={{
                        fontSize: getFontSize(13),
                        marginLeft: -scale(2),
                      }}
                    />
                  </View>

                  {/* Document Type Selection */}
                  <View style={{ marginBottom: getSpacing(16) }}>
                    <View
                      className="flex-row items-center"
                      style={{ marginBottom: getSpacing(8) }}
                    >
                      <Text
                        className="font-pmedium text-gray-800"
                        style={{ fontSize: getFontSize(13) }}
                      >
                        Document Type
                      </Text>
                    </View>

                    <View className="flex-row" style={{ gap: scale(4) }}>
                      <DocumentTypeCard
                        type="Document"
                        icon="file-document-outline"
                        isSelected={form.documentType === "Other Document"}
                        onPress={() =>
                          setForm({
                            ...form,
                            documentType: "Other Document",
                            fileType: "",
                            link: "",
                          })
                        }
                      />
                      <DocumentTypeCard
                        type="Link"
                        icon="link"
                        isSelected={form.documentType === "eScript Link"}
                        onPress={() =>
                          setForm({
                            ...form,
                            documentType: "eScript Link",
                            fileType: "link",
                            file: null,
                          })
                        }
                      />
                    </View>
                  </View>

                  {/* File/Link Input */}
                  <View
                    className="bg-white rounded-lg border border-gray-100"
                    style={{
                      padding: scale(12),
                      marginBottom: getSpacing(16),
                    }}
                  >
                    {form.documentType === "eScript Link" ? (
                      <>
                        <View
                          className="flex-row items-center"
                          style={{ marginBottom: getSpacing(6) }}
                        >
                          <MaterialCommunityIcons
                            name="link"
                            size={scale(16)}
                            color="#4B5563"
                          />
                          <Text
                            className="font-pmedium text-gray-700"
                            style={{
                              fontSize: getFontSize(12),
                              marginLeft: scale(6),
                            }}
                          >
                            Link URL
                          </Text>
                        </View>
                        <TextInput
                          value={form.link || ""}
                          onChangeText={(text) =>
                            setForm({ ...form, link: text })
                          }
                          placeholder="https://example.com/your-link"
                          placeholderTextColor="#9CA3AF"
                          className="font-pmedium text-gray-900"
                          keyboardType="url"
                          autoCapitalize="none"
                          style={{
                            fontSize: getFontSize(13),
                            marginLeft: -scale(2),
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <View
                          className="flex-row items-center"
                          style={{ marginBottom: getSpacing(8) }}
                        >
                          <MaterialCommunityIcons
                            name="file-document-outline"
                            size={scale(16)}
                            color="#4B5563"
                          />
                          <Text
                            className="font-pmedium text-gray-700"
                            style={{
                              fontSize: getFontSize(12),
                              marginLeft: scale(6),
                            }}
                          >
                            Upload File
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={onUploadDocument}
                          activeOpacity={0.8}
                        >
                          {form.file ? (
                            <View className="relative">
                              {form.file.uri &&
                              (form.file as any).mimeType?.startsWith(
                                "image/",
                              ) ? (
                                <Image
                                  source={{ uri: form.file.uri }}
                                  style={{
                                    width: "100%",
                                    height: scale(140),
                                    borderRadius: scale(8),
                                  }}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View
                                  className="border border-gray-200 rounded-lg items-center justify-center bg-gray-50"
                                  style={{
                                    height: scale(140),
                                    borderRadius: scale(8),
                                  }}
                                >
                                  <MaterialCommunityIcons
                                    name="file-pdf-box"
                                    size={scale(40)}
                                    color="#EF4444"
                                  />
                                  <Text
                                    className="font-pmedium text-gray-700 text-center"
                                    style={{
                                      fontSize: getFontSize(11),
                                      marginTop: getSpacing(6),
                                      paddingHorizontal: scale(12),
                                    }}
                                    numberOfLines={2}
                                  >
                                    {(form.file as any).name ||
                                      "Document selected"}
                                  </Text>
                                </View>
                              )}
                              <TouchableOpacity
                                onPress={() => setForm({ ...form, file: null })}
                                className="absolute top-2 right-2 bg-black/60 rounded-full"
                                style={{ padding: scale(4) }}
                              >
                                <MaterialCommunityIcons
                                  name="close"
                                  size={scale(12)}
                                  color="white"
                                />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View
                              className="border border-gray-300 rounded-lg items-center bg-gray-50"
                              style={{ paddingVertical: getSpacing(20) }}
                            >
                              <View
                                className="bg-orange-100 rounded-full items-center justify-center"
                                style={{
                                  width: scale(40),
                                  height: scale(40),
                                  marginBottom: getSpacing(8),
                                }}
                              >
                                <MaterialCommunityIcons
                                  name="cloud-upload-outline"
                                  size={scale(20)}
                                  color="#FF9C01"
                                />
                              </View>
                              <Text
                                className="font-pmedium text-gray-700"
                                style={{
                                  fontSize: getFontSize(12),
                                  marginBottom: verticalScale(2),
                                }}
                              >
                                Tap to upload file
                              </Text>
                              <Text
                                className="font-pregular text-gray-500 text-center"
                                style={{ fontSize: getFontSize(10) }}
                              >
                                PDF, Images, Documents
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </ScrollView>

                {/* Action Buttons */}
                <View
                  style={{
                    paddingHorizontal: scale(20),
                    paddingBottom: getSpacing(24),
                    paddingTop: getSpacing(8),
                  }}
                >
                  <View className="flex-row" style={{ gap: scale(12) }}>
                    <TouchableOpacity
                      onPress={onClose}
                      className="flex-1 rounded-lg bg-gray-100"
                      style={{ paddingVertical: getSpacing(10) }}
                    >
                      <Text
                        className="text-center font-pmedium text-gray-600"
                        style={{ fontSize: getFontSize(13) }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={onSubmit}
                      className={`flex-1 rounded-lg shadow-md ${
                        uploading ? "bg-gray-300" : "bg-orange-400"
                      }`}
                      style={{ paddingVertical: getSpacing(10) }}
                      disabled={uploading}
                    >
                      <Text
                        className={`text-center font-pmedium ${
                          uploading ? "text-gray-500" : "text-black"
                        }`}
                        style={{ fontSize: getFontSize(13) }}
                      >
                        {uploading ? "Uploading..." : "Upload & Save"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </BlurView>
    </Modal>
  );
};

export default UploadModal;
