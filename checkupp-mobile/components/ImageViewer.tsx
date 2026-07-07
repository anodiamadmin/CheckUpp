import {
  View,
  Modal,
  Alert,
  Image,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useToast } from "@/components/ToastProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import React, { useState } from "react";
import { AntDesign, Ionicons } from "@expo/vector-icons";

const ImagePreview = ({
  visible,
  uri,
  onClose,
}: {
  visible: boolean;
  uri: string;
  onClose: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const { showToast } = useToast();

  const handleLoadStart = () => {
    setLoading(true);
    fadeAnim.setValue(0);
  };

  const handleLoadEnd = () => {
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const saveImage = async () => {
    try {
      setSaving(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant media library permissions to save images.",
          [{ text: "OK" }]
        );
        return;
      }

      let localUri = uri;
      if (uri.startsWith("http")) {
        const timestamp = new Date().getTime();
        const filename = `checkupp_image_${timestamp}.png`;
        const downloadLocation = `${FileSystem.cacheDirectory}${filename}`;

        const { uri: downloadedUri } = await FileSystem.downloadAsync(
          uri,
          downloadLocation
        );
        localUri = downloadedUri;
      } else if (!localUri.match(/\.(png|jpg|jpeg)$/i)) {
        const timestamp = new Date().getTime();
        const newFilename = `${FileSystem.cacheDirectory}checkupp_image_${timestamp}.png`;
        await FileSystem.copyAsync({
          from: localUri,
          to: newFilename,
        });
        localUri = newFilename;
      }

      const asset = await MediaLibrary.createAssetAsync(localUri);
      await MediaLibrary.createAlbumAsync("CheckUpp", asset, false);

      onClose();

      showToast("Image saved successfully!", "success");
    } catch (error) {
      console.error("Error saving image:", error);
      showToast("Failed to save image", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView className="flex-1 bg-black relative">
        {loading && (
          <View className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center z-10">
            <ActivityIndicator size="large" color="white" />
          </View>
        )}

        <View className="flex-1 justify-center items-center">
          <Animated.View
            style={{ opacity: fadeAnim }}
            className="flex-1 w-full"
          >
            <Image
              source={{ uri }}
              className="w-full h-full"
              resizeMode="contain"
              accessibilityLabel="Preview image"
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
            />
          </Animated.View>
        </View>

        <View className="absolute bottom-14 w-full flex-row justify-center items-center space-x-6">
          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            className="p-2 bg-white/20 rounded-full"
            activeOpacity={0.7}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
            }}
          >
            <AntDesign name="close" size={30} color="white" />
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity
            onPress={saveImage}
            disabled={saving}
            className="p-2 bg-white/20 rounded-full"
            activeOpacity={0.7}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="download-outline" size={30} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default ImagePreview;
