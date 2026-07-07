import React, { useMemo, useState } from "react";
import {
  Text,
  View,
  Image,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  PixelRatio,
  Platform,
} from "react-native";
import EmptyState from "@/components/EmptyState";
import SearchInput from "@/components/SearchInput";
import { useToast } from "@/components/ToastProvider";
import * as Sharing from "expo-sharing";
import LoadingSpinner from "@/components/LoadingSpinner";
import * as FileSystem from "expo-file-system/legacy";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useWalletSearch } from "@/lib/features/documents/queries";

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
  const extraPadding = getSpacing(16);
  const safeAreaPadding = Platform.OS === "ios" ? 34 : 0;
  return tabBarHeight + extraPadding + safeAreaPadding;
};

const SearchFileCard = ({
  item,
  onView,
}: {
  item: any;
  onView: () => void;
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
      marginHorizontal: 0,
      paddingHorizontal: scale(12),
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
              marginBottom: getSpacing(2),
            }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            className="font-pregular text-gray-500"
            style={{
              fontSize: getFontSize(10),
              marginBottom: getSpacing(1),
            }}
            numberOfLines={1}
          >
            {item.description}
          </Text>
          <Text
            className="font-pextralight text-gray-400"
            style={{ fontSize: getFontSize(9) }}
          >
            Added: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={onView}
          className="bg-blue-50 rounded-lg"
          style={{
            padding: scale(6),
            marginLeft: scale(8),
          }}
          activeOpacity={0.7}
        >
          <Feather name="eye" size={scale(14)} color="#3B82F6" />
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
);

const Search = () => {
  const { userId } = useGlobalContext();
  const { query } = useLocalSearchParams();
  const queryValue = useMemo(() => {
    if (Array.isArray(query)) return query[0] ?? "";
    return typeof query === "string" ? query : "";
  }, [query]);

  const { data: files, refetch } = useWalletSearch(userId, queryValue);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const handleViewDetails = async (file: any) => {
    setRefreshing(true);
    try {
      if (file.fileType === "image") {
        const imageUri = `${FileSystem.cacheDirectory}${file.title}.png`;
        const downloadResult = await FileSystem.downloadAsync(
          file.file,
          imageUri,
        );

        if (downloadResult.status === 200) {
          await Sharing.shareAsync(imageUri);
        } else {
          showToast("Failed to download the image.", "error");
        }
      } else {
        const fileUri = `${FileSystem.cacheDirectory}${file.title}.pdf`;
        const downloadResult = await FileSystem.downloadAsync(
          file.file,
          fileUri,
        );

        if (downloadResult.status === 200) {
          await Sharing.shareAsync(fileUri);
        } else {
          showToast("Failed to download the file.", "error");
        }
      }
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="bg-white h-full">
        <FlatList
          data={files}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await refetch();
                setRefreshing(false);
              }}
              tintColor="#00CED1"
              colors={["#00CED1"]}
            />
          }
          keyExtractor={(item: any) => item.$id || item.id}
          renderItem={({ item }) => (
            <SearchFileCard
              item={item}
              onView={() => handleViewDetails(item)}
            />
          )}
          ListHeaderComponent={() => (
            <View
              style={{
                paddingHorizontal: scale(12),
                paddingVertical: getSpacing(8),
              }}
            >
              <View
                className="flex-row items-center"
                style={{ marginBottom: getSpacing(16) }}
              >
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="rounded-full bg-gray-50 items-center justify-center"
                  style={{
                    width: scale(32),
                    height: scale(32),
                    marginRight: scale(8),
                  }}
                >
                  <Feather name="chevron-left" size={scale(18)} color="black" />
                </TouchableOpacity>
                <Text
                  className="font-pmedium text-black"
                  style={{ fontSize: getFontSize(18) }}
                >
                  Search results
                </Text>
              </View>

              <View style={{ marginBottom: getSpacing(12) }}>
                <SearchInput initialQuery={query?.toString() || ""} />
              </View>

              <View
                className="border-b border-gray-200"
                style={{ marginBottom: getSpacing(8) }}
              />
            </View>
          )}
          ListEmptyComponent={() => (
            <EmptyState
              title="No files found"
              subTitle="No files found for this search query"
              buttonVisible={true}
            />
          )}
          contentContainerStyle={{
            paddingBottom: getTabBarSafeBottomPadding(),
          }}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      <LoadingSpinner visible={refreshing} />
    </GestureHandlerRootView>
  );
};

export default Search;
