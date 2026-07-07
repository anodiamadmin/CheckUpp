import React, { useState } from "react";
import {
  Text,
  View,
  Alert,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  PixelRatio,
  Animated,
  Platform,
  Image,
} from "react-native";
import EmptyState from "@/components/EmptyState";
import SearchInput from "@/components/SearchInput";
import { apiConfig } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import ImageViewer from "@/components/ImageViewer";
import DocumentViewer from "@/components/DocumentViewer";
import { LinearGradient } from "expo-linear-gradient";
import UploadModal from "@/components/UploadModal";
import { useDeleteDocumentMutation } from "@/lib/features/documents/mutations";
import { useWalletFiles } from "@/lib/features/documents/queries";
import useScreenEntrance from "@/lib/animation/useScreenEntrance";

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

// Calculate proper bottom padding for tab bar
const getTabBarSafeBottomPadding = () => {
  const tabBarHeight = Platform.OS === "ios" ? 68 : 58;
  const extraPadding = getSpacing(24);
  const safeAreaPadding = Platform.OS === "ios" ? 34 : 0;
  return tabBarHeight + extraPadding + safeAreaPadding;
};

const getFABBottomPosition = () => {
  const tabBarHeight = Platform.OS === "ios" ? 68 : 58;
  const safeAreaBottom = Platform.OS === "ios" ? 15 : 12;
  const extraSpacing = scale(16);

  return tabBarHeight + safeAreaBottom + extraSpacing;
};

const TABS = [
  {
    id: "medicalDocs",
    label: "Documents",
    icon: "folder-outline",
    iconColor: "#FF9C01",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    filter: (item: any) => !["eScript Link"].includes(item.documentType),
  },
  {
    id: "eScriptWallet",
    label: "Links",
    icon: "link",
    iconColor: "#FF9C01",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    filter: (item: any) => item.documentType === "eScript Link",
  },
];

const toAbsoluteFileUrl = (value: string | null | undefined) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const base = apiConfig.baseUrl.replace(/\/api\/v1\/?$/, "");
  if (!base) return value;

  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
};

const FileCard = ({
  item,
  onView,
  onDelete,
}: {
  item: any;
  onView: () => void;
  onDelete: () => void;
}) => (
  <TouchableOpacity
    onPress={onView}
    activeOpacity={0.8}
    style={{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
      marginBottom: getSpacing(8),
    }}
  >
    <View
      className="bg-white rounded-xl border border-gray-100"
      style={{ padding: scale(14) }}
    >
      <View className="flex-row items-center">
        {/* File Icon/Thumbnail - UNIFORM GRAY */}
        <View
          className="bg-gray-100 rounded-lg"
          style={{
            padding: scale(8),
            marginRight: scale(12),
            width: scale(40),
            height: scale(40),
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {item.fileType === "image" ? (
            <Image
              source={{ uri: item.file }}
              style={{
                width: scale(28),
                height: scale(28),
                borderRadius: scale(4),
              }}
              resizeMode="cover"
            />
          ) : (
            <MaterialCommunityIcons
              name={item.fileType === "link" ? "link-variant" : "file-document"}
              size={scale(18)}
              color="#6B7280"
            />
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          <Text
            className="font-pmedium text-gray-900"
            style={{
              fontSize: getFontSize(13),
              marginBottom: verticalScale(3),
            }}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <View className="flex-row items-center justify-between">
            <Text
              className="font-pregular text-gray-500"
              style={{ fontSize: getFontSize(10) }}
            >
              {item.fileType === "link" ? "Link" : "Document"} •{" "}
              {item.createdAt}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={onView}
            className="bg-blue-50 rounded-lg"
            style={{ padding: scale(6), marginRight: scale(6) }}
          >
            <Feather
              name={item.fileType === "link" ? "external-link" : "eye"}
              size={scale(14)}
              color="#3B82F6"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDelete}
            className="bg-red-50 rounded-lg"
            style={{ padding: scale(6) }}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={scale(14)}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

const HealthWallet = () => {
  const { userId } = useGlobalContext();
  const { data: files, refetch, loading, error } = useWalletFiles(userId);

  const [selectedTab, setSelectedTab] = useState(TABS[0].id);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useScreenEntrance();

  const { showToast } = useToast();
  const docUpload = useDocumentUpload({ userId, showToast });
  const deleteDocument = useDeleteDocumentMutation(userId);

  // Viewers
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    onRefresh();
  };

  const handleViewDetails = async (item: any) => {
    console.log(
      "[Wallet Preview]",
      JSON.stringify({
        fileType: item.fileType,
        file: item.file,
        documentType: item.documentType,
      }),
    );
    try {
      const isImage =
        item.fileType === "image" ||
        /\.(jpe?g|png|gif|bmp|webp|heic|heif)$/i.test(item.file || "");

      if (isImage) {
        setViewingImage(item.file);
      } else if (item.fileType === "link") {
        await WebBrowser.openBrowserAsync(item.file);
      } else {
        await WebBrowser.openBrowserAsync(item.file);
      }
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  const handleDeleteFile = async (id: string) => {
    Alert.alert(
      "Delete File",
      "Are you sure you want to delete this file? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDocument.mutateAsync(id);
            } catch {}
          },
        },
      ],
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formattedFiles =
    files?.map((file: any) => ({
      id: file.$id || file.id,
      title: file.title || "Untitled",
      description: file.description || "No description",
      documentType: file.documentType || "Unknown",
      file: toAbsoluteFileUrl(file.file || file.publicUrl || file.externalUrl),
      fileType: file.fileType,
      createdAt: new Date(
        file.$createdAt || file.createdAt,
      ).toLocaleDateString(),
      updatedAt: new Date(
        file.$updatedAt || file.updatedAt,
      ).toLocaleDateString(),
    })) || [];

  const currentTab = TABS.find((tab) => tab.id === selectedTab);
  const filteredData = formattedFiles.filter(
    currentTab?.filter || (() => true),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF9C01"
              colors={["#FF9C01"]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: getTabBarSafeBottomPadding() + scale(60),
          }}
        >
          {/* Tabs */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
              marginHorizontal: scale(12),
              marginTop: getSpacing(8),
              marginBottom: getSpacing(16),
            }}
          >
            <View
              className="bg-white rounded-xl overflow-hidden"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <View
                className="flex-row"
                style={{
                  padding: scale(3),
                  gap: scale(3),
                }}
              >
                {TABS.map((tab) => {
                  const isActive = selectedTab === tab.id;

                  return (
                    <View key={tab.id} className="flex-1">
                      <TouchableOpacity
                        onPress={() => handleTabChange(tab.id)}
                        activeOpacity={0.8}
                        style={{
                          shadowColor: isActive ? "#FF9C01" : "transparent",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: isActive ? 0.1 : 0,
                          shadowRadius: 2,
                          elevation: isActive ? 1 : 0,
                        }}
                      >
                        <LinearGradient
                          colors={
                            isActive
                              ? (["#FFF7ED", "#FFFFFF"] as const)
                              : (["#F9FAFB", "#FFFFFF"] as const)
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          className={`rounded-lg border ${
                            isActive ? "border-orange-200" : "border-gray-100"
                          }`}
                          style={{
                            paddingVertical: getSpacing(8),
                            paddingHorizontal: scale(6),
                          }}
                        >
                          <View className="items-center justify-center">
                            <View className="flex-row items-center justify-center">
                              <View
                                className={`rounded-lg ${
                                  isActive ? "bg-orange-50" : "bg-gray-50"
                                }`}
                                style={{
                                  padding: scale(4),
                                }}
                              >
                                <MaterialCommunityIcons
                                  name={tab.icon as any}
                                  size={scale(14)}
                                  color={isActive ? "#FF9C01" : "#9CA3AF"}
                                />
                              </View>

                              <Text
                                className={`font-pmedium ${
                                  isActive ? "text-secondary" : "text-gray-500"
                                }`}
                                style={{
                                  fontSize: getFontSize(11),
                                  textAlign: "center",
                                  flex: 1,
                                }}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                              >
                                {tab.label}
                              </Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Search */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
              marginHorizontal: scale(12),
              marginBottom: getSpacing(16),
            }}
          >
            <SearchInput placeholderText={`Search ${currentTab?.label}...`} />
          </Animated.View>

          {/* Files List */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
              marginHorizontal: scale(12),
            }}
          >
            {!loading && filteredData.length > 0 ? (
              <View
                className="bg-white rounded-xl overflow-hidden"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                {/* Header */}
                <View
                  className="flex-row items-center justify-between"
                  style={{
                    paddingHorizontal: scale(16),
                    paddingVertical: getSpacing(12),
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`rounded-lg ${currentTab?.bgColor}`}
                      style={{ padding: scale(6) }}
                    >
                      <MaterialCommunityIcons
                        name={currentTab?.icon as any}
                        size={scale(16)}
                        color={currentTab?.iconColor}
                      />
                    </View>
                    <Text
                      className="font-psemibold text-gray-900 ml-3"
                      style={{ fontSize: getFontSize(15) }}
                    >
                      {currentTab?.label}
                    </Text>
                  </View>

                  <View
                    className="bg-orange-50 rounded-full"
                    style={{
                      paddingHorizontal: scale(8),
                      paddingVertical: scale(4),
                    }}
                  >
                    <Text
                      className="text-secondary font-pmedium"
                      style={{ fontSize: getFontSize(10) }}
                    >
                      {filteredData.length} files
                    </Text>
                  </View>
                </View>

                {/* Files */}
                <View style={{ padding: scale(4) }}>
                  {filteredData.map((item: any) => (
                    <FileCard
                      key={item.id}
                      item={item}
                      onView={() => handleViewDetails(item)}
                      onDelete={() => handleDeleteFile(item.id)}
                    />
                  ))}
                </View>
              </View>
            ) : error ? (
              <View
                className="bg-red-50 border border-red-200 rounded-xl"
                style={{ padding: scale(16) }}
              >
                <Text
                  className="text-center text-red-600 font-pmedium"
                  style={{ fontSize: getFontSize(13) }}
                >
                  Error fetching files
                </Text>
              </View>
            ) : (
              <EmptyState
                title={`No ${currentTab?.label} found`}
                subTitle={`Upload your ${currentTab?.label.toLowerCase()} files to get started!`}
                buttonVisible={false}
              />
            )}
          </Animated.View>
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          onPress={() => docUpload.open()}
          activeOpacity={0.8}
          style={{
            position: "absolute",
            bottom: getFABBottomPosition(),
            right: scale(20),
            backgroundColor: "#FF9C01",
            borderRadius: scale(24),
            width: scale(48),
            height: scale(48),
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#FF9C01",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 6,
            zIndex: 1000,
          }}
          accessibilityLabel="Add New Document"
          accessibilityHint="Tap to open the upload document modal"
        >
          <AntDesign name="plus" size={scale(20)} color="#fff" />
        </TouchableOpacity>

        {/* Upload Modal */}
        <UploadModal
          visible={docUpload.visible}
          onClose={docUpload.close}
          form={docUpload.form}
          setForm={docUpload.setForm as any}
          uploading={docUpload.uploading}
          onSubmit={docUpload.submit}
          onUploadDocument={docUpload.pickDocument}
        />

        {/* Viewers */}
        <ImageViewer
          visible={!!viewingImage}
          uri={viewingImage || ""}
          onClose={() => setViewingImage(null)}
        />

        <DocumentViewer
          visible={!!viewingDocument}
          url={viewingDocument || ""}
          onClose={() => setViewingDocument(null)}
        />

        <LoadingSpinner
          visible={
            loading ||
            refreshing ||
            docUpload.uploading ||
            deleteDocument.isPending
          }
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default HealthWallet;
