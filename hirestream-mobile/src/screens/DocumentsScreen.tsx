import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { api, uploadFile } from "../api";

interface DocumentsScreenProps {
  onBack: () => void;
}

export default function DocumentsScreen({ onBack }: DocumentsScreenProps) {
  const insets = useSafeAreaInsets();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    const res = await api("/api/v1/candidates/documents");
    if (res.success && res.data) {
      setDocuments(res.data);
    } else if (!res.success) {
      Alert.alert("Error", res.error?.message || "Failed to load documents.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];

      // F5.5: 5 MB size limit validation
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert("File too large", "Please select a file smaller than 5 MB.");
        return;
      }

      await uploadSelectedFile(file.uri, file.name, file.mimeType || "application/pdf");
    } catch (err) {
      Alert.alert("Upload Error", "Failed to pick document.");
    }
  };

  const handleUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Sorry, we need camera roll permissions to make this work!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      
      // Provide fallback name and type if not present
      const name = file.fileName || `upload_${Date.now()}.jpg`;
      const type = file.mimeType || "image/jpeg";

      await uploadSelectedFile(file.uri, name, type);
    } catch (err) {
      Alert.alert("Upload Error", "Failed to pick image.");
    }
  };

  const uploadSelectedFile = async (uri: string, name: string, type: string) => {
    setUploading(true);
    // As F5.5 suggests, backend needs type (e.g., 'cv', 'passport', 'certificate', 'other')
    // We'll default to 'other' here or prompt the user. For simplicity, we send 'other'.
    const res = await uploadFile("/api/v1/candidates/documents", uri, name, type, { type: "other" });
    setUploading(false);

    if (res.success) {
      Alert.alert("Success", "Document uploaded successfully.");
      fetchDocuments();
    } else {
      Alert.alert("Error", res.error?.message || "Failed to upload document.");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Document", "Are you sure you want to delete this document?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await api(`/api/v1/candidates/documents/${id}`, { method: "DELETE" });
          if (res.success) {
            setDocuments((prev) => prev.filter((d) => d.id !== id));
          } else {
            Alert.alert("Error", res.error?.message || "Failed to delete document.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.helperText}>
          Upload your resume, passport copy, and certificates to support your job applications. (Max 5MB per file)
        </Text>

        <View style={styles.uploadActions}>
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadDocument} disabled={uploading}>
            <Ionicons name="document-text-outline" size={20} color="#ffffff" />
            <Text style={styles.uploadButtonText}>Upload File</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPhoto} disabled={uploading}>
            <Ionicons name="image-outline" size={20} color="#ffffff" />
            <Text style={styles.uploadButtonText}>From Gallery</Text>
          </TouchableOpacity>
        </View>

        {uploading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Uploading...</Text>
          </View>
        )}

        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : documents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptySub}>Upload documents to improve your profile completeness.</Text>
            </View>
          ) : (
            documents.map((doc) => (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docIconWrap}>
                  <Ionicons
                    name={doc.type === "cv" ? "document-text" : "document"}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.fileName}
                  </Text>
                  <Text style={styles.docMeta}>
                    {doc.type.toUpperCase()} • {new Date(doc.uploadedAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(doc.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primaryDark,
  },
  backButton: { padding: spacing.sm, marginLeft: -spacing.sm },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: "#ffffff" },
  scrollArea: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  helperText: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 22 },
  uploadActions: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  uploadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  uploadButtonText: { color: "#ffffff", fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  loadingBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginBottom: spacing.lg },
  loadingText: { color: colors.textSecondary, fontSize: fontSize.md },
  listContainer: { gap: spacing.md },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docIconWrap: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  docInfo: { flex: 1, marginLeft: spacing.md },
  docName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text, marginBottom: 2 },
  docMeta: { fontSize: fontSize.sm, color: colors.textTertiary },
  deleteBtn: { padding: spacing.sm },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs },
  emptySub: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: "center", maxWidth: 280, lineHeight: 22 },
});
