// ImageCropper.js
import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';

/**
 * ImageCropper (Native Wrapper)
 * This component launches the native cropper and waits for the result
 */
export default function ImageCropper({
  image,
  visible,
  onCropComplete,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);

  const openNativeCropper = useCallback(async () => {
    if (!image) {
      console.warn('No image provided to cropper');
      onCancel();
      return;
    }

    try {
      setLoading(true);

      console.log('Opening cropper with image:', image);

      // Launch native cropper
      const croppedImage = await ImagePicker.openCropper({
        path: image,
        width: 800,
        height: 800,
        cropping: true,
        cropperCircleOverlay: false,
        compressImageQuality: 0.8,
        compressImageMaxWidth: 1024,
        compressImageMaxHeight: 1024,
        mediaType: 'photo',
        includeBase64: false,
        includeExif: false,
        cropperToolbarTitle: 'Crop QR Code',
        cropperCancelText: 'Cancel',
        cropperChooseText: 'Done',
        enableRotationGesture: true,
        freeStyleCropEnabled: true,
      });

      console.log('Cropped image result:', {
        path: croppedImage.path,
        mime: croppedImage.mime,
        size: croppedImage.size,
        width: croppedImage.width,
        height: croppedImage.height,
      });

      // Return the cropped image to parent
      onCropComplete(croppedImage);
      
    } catch (error) {
      if (error?.code === 'E_PICKER_CANCELLED') {
        console.log('User cancelled cropping');
      } else {
        console.error('Crop Error:', error);
        console.error('Error details:', {
          code: error?.code,
          message: error?.message,
        });
      }
    } finally {
      setLoading(false);
      onCancel();
    }
  }, [image, onCropComplete, onCancel]);

  useEffect(() => {
    // Launch cropper when visible
    if (visible && !loading) {
      // Timeout ensures modal is fully rendered
      const timer = setTimeout(openNativeCropper, 100);
      return () => clearTimeout(timer);
    }
  }, [visible, loading, openNativeCropper]);

  if (!visible) return null;

  // Loading screen shown while native cropper is launching
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.text}>Opening crop tool…</Text>
        <Text style={styles.subText}>
          (Using Native {Platform.OS === 'ios' ? 'iOS' : 'Android'} Cropper)
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 16,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  subText: {
    marginTop: 4,
    color: '#9CA3AF',
    fontSize: 14,
  },
});