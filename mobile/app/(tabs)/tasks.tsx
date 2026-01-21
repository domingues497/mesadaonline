import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TextInput, TouchableOpacity, Switch, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { TaskCard } from "@/components/TaskCard";
import { Task, TaskRecurrence } from "@/types";
import { formatBRL } from "@/lib/currency";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Edit, Trash2, Check, X } from "lucide-react-native";

interface DaughterProfile {
  id: string;
  display_name: string;
}

export default function TasksScreen() {
  const { profile, loading: authLoading, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [parentTasks, setParentTasks] = useState<Task[]>([]);
  const [daughters, setDaughters] = useState<DaughterProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form States
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("none");
  const [attachmentRequired, setAttachmentRequired] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState(1); // 1 = Monday
  const [recurrenceTime, setRecurrenceTime] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  
  const [creating, setCreating] = useState(false);
  const [selectedTaskInstance, setSelectedTaskInstance] = useState<any | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [submissionNote, setSubmissionNote] = useState("");
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  const loadTasks = async () => {
    if (!profile) {
        setLoading(false);
        return;
    }

    try {
      setLoading(true);

      if (profile.role === "child") {
        const { data: taskData, error } = await supabase
          .from("task_instances")
          .select(`
              id,
              due_date,
              status,
              task:tasks (
                id,
                title,
                description,
                value_cents,
                attachment_required
              )
          `)
          .eq("daughter_id", profile.id)
          .order("due_date", { ascending: true });

        if (error) {
          console.error("Error loading tasks:", error);
          return;
        }

        if (taskData) {
          setTasks(taskData);
        }
      } else if (profile.role === "parent") {
        // Load pending approvals
        const { data: pendingData, error: pendingError } = await supabase
          .from("task_instances")
          .select(`
            id,
            status,
            due_date,
            task:tasks (
              title,
              value_cents,
              attachment_required
            ),
            daughter:daughters!daughter_id (
              id,
              profile:profiles (
                display_name
              )
            ),
            submissions (
                id,
                proof_url,
                note,
                created_at
            )
          `)
          .eq("status", "submitted");
        
        if (pendingError) console.error("Error loading approvals:", pendingError);
        if (pendingData) {
            // Sort submissions to ensure we show the latest one
            const sortedData = pendingData.map((instance: any) => ({
                ...instance,
                submissions: instance.submissions?.sort((a: any, b: any) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
            }));
            setPendingApprovals(sortedData);
        }

        // Load Tasks
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("family_id", profile.family_id)
          .eq("active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setParentTasks(data as Task[]);

        // Load daughters for assignment directly from profiles to avoid ambiguous relationships
        console.log("Loading daughters for family:", profile.family_id);
        const { data: daughtersData, error: daughtersError } = await supabase
          .from("profiles")
          .select("id, display_name, family_id, role")
          .eq("family_id", profile.family_id)
          .eq("role", "child");
        
        console.log("Daughters loaded:", daughtersData);
        if (daughtersError) console.error("Error loading daughters:", daughtersError);

        if (daughtersError) throw daughtersError;

        if (daughtersData) {
          setDaughters(
            daughtersData.map((p: any) => ({
              id: p.id,
              display_name: p.display_name,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setValue("");
    setRecurrence("none");
    setAttachmentRequired(false);
    setRecurrenceDay(1);
    setRecurrenceTime("");
    setSelectedAssignees([]);
    setEditingTaskId(null);
    setShowForm(false);
  };

  const handleEditTask = (task: any) => {
    setTitle(task.title);
    setDescription(task.description || "");
    setValue((task.value_cents / 100).toFixed(2).replace(".", ","));
    setRecurrence(task.recurrence);
    setAttachmentRequired(task.attachment_required);
    setRecurrenceDay(task.recurrence_day || 1);
    setRecurrenceTime(task.recurrence_time || "");
    setSelectedAssignees(task.assignees || []);
    setEditingTaskId(task.id);
    setShowForm(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    Alert.alert(
      "Excluir Tarefa",
      "Tem certeza que deseja excluir esta tarefa? Isso não afetará tarefas já realizadas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("tasks")
                .update({ active: false })
                .eq("id", taskId);

              if (error) throw error;
              await loadTasks();
            } catch (error) {
              console.error("Error deleting task:", error);
              Alert.alert("Erro", "Não foi possível excluir a tarefa.");
            }
          },
        },
      ]
    );
  };

  const handleApproveTask = async (instance: any) => {
    try {
      setLoading(true);
      // 1. Update task_instance status
      const { error: updateError } = await supabase
        .from('task_instances')
        .update({ status: 'approved' })
        .eq('id', instance.id);
        
      if (updateError) throw updateError;

      // 2. Create transaction for reward
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          daughter_id: instance.daughter.id,
          amount_cents: instance.task.value_cents,
          kind: 'task_approved',
          memo: `Recompensa: ${instance.task.title}`,
        });
        
      if (txError) throw txError;
      
      Alert.alert("Sucesso", "Tarefa aprovada e recompensa enviada!");
      await loadTasks();
    } catch (error: any) {
      console.error("Error approving task:", error);
      Alert.alert("Erro", error.message || "Erro ao aprovar tarefa");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTask = async (instanceId: string) => {
    Alert.alert(
        "Rejeitar Tarefa",
        "Deseja realmente rejeitar esta tarefa? O status voltará para pendente para que a filha possa refazer.",
        [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Rejeitar",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true);
                        const { error } = await supabase
                            .from('task_instances')
                            .update({ status: 'rejected' }) // Or 'pending' if we want them to retry immediately? 'rejected' is better for history.
                            .eq('id', instanceId);
                            
                        if (error) throw error;
                        
                        Alert.alert("Tarefa rejeitada", "O status foi atualizado.");
                        await loadTasks();
                    } catch (error: any) {
                        console.error("Error rejecting task:", error);
                        Alert.alert("Erro", error.message);
                    } finally {
                        setLoading(false);
                    }
                }
            }
        ]
    );
  };

  const handleCreateOrUpdateTask = async () => {
    if (!profile?.family_id) {
      Alert.alert("Erro", "Família não encontrada. Faça login novamente.");
      return;
    }

    if (profile.role !== "parent") {
      Alert.alert("Erro", "Apenas pais podem criar tarefas.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Erro", "O título da tarefa é obrigatório.");
      return;
    }

    const parsedValue = parseFloat(value.replace(",", ".") || "0");
    const valueCents = Math.round(parsedValue * 100);

    const taskData = {
      family_id: profile.family_id,
      title: title.trim(),
      description: description.trim() || null,
      value_cents: valueCents,
      recurrence,
      attachment_required: attachmentRequired,
      recurrence_day: ["daily", "weekly"].includes(recurrence) ? recurrenceDay : null,
      recurrence_time: ["daily", "weekly"].includes(recurrence) && recurrenceTime ? recurrenceTime : null,
      assignees: selectedAssignees.length > 0 ? selectedAssignees : null,
    };

    try {
      setCreating(true);

      let error;
      let targetTaskId = editingTaskId;

      if (editingTaskId) {
        // Update
        const { error: updateError } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", editingTaskId);
        error = updateError;
      } else {
        // Create
        const { data: newTask, error: insertError } = await supabase
          .from("tasks")
          .insert(taskData)
          .select()
          .single();
        error = insertError;
        if (newTask) {
          targetTaskId = newTask.id;
        }
      }

      if (error) {
        console.error("Error saving task:", error);
        Alert.alert("Erro ao salvar tarefa", error.message);
        return;
      }

      // Create task instances immediately if applicable
      if (targetTaskId && selectedAssignees.length > 0) {
        const now = new Date();
        // Adjust for timezone to get local YYYY-MM-DD
        const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
        const todayStr = localDate.toISOString().split('T')[0];
        const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, etc.
        
        let shouldCreateInstance = false;
        
        if (recurrence === 'none' || recurrence === 'daily') {
            shouldCreateInstance = true;
        } else if (recurrence === 'weekly') {
            // Check if recurrenceDay matches today
            if (recurrenceDay === dayOfWeek) {
                shouldCreateInstance = true;
            }
        }
        
        if (shouldCreateInstance) {
            // Create instances for each assignee if not exists
            for (const daughterId of selectedAssignees) {
                // Check existing
                const { data: existing } = await supabase
                    .from('task_instances')
                    .select('id')
                    .eq('task_id', targetTaskId)
                    .eq('daughter_id', daughterId)
                    .eq('due_date', todayStr)
                    .maybeSingle();
                    
                if (!existing) {
                    await supabase.from('task_instances').insert({
                        task_id: targetTaskId,
                        daughter_id: daughterId,
                        due_date: todayStr,
                        status: 'pending'
                    });
                }
            }
        }
      }

      Alert.alert(
        editingTaskId ? "Tarefa atualizada" : "Tarefa criada",
        `A tarefa foi ${editingTaskId ? "atualizada" : "criada"} com sucesso.`
      );

      resetForm();
      await loadTasks();
    } catch (error: any) {
      console.error("Error saving task:", error);
      Alert.alert(
        "Erro ao salvar tarefa",
        error?.message || "Ocorreu um erro inesperado."
      );
    } finally {
      setCreating(false);
    }
  };

  const toggleAssignee = (daughterId: string) => {
    setSelectedAssignees(prev => {
      if (prev.includes(daughterId)) {
        return prev.filter(id => id !== daughterId);
      }
      return [...prev, daughterId];
    });
  };

  const handleOpenTaskInstance = (taskInstance: any) => {
    if (taskInstance.status !== "pending" && taskInstance.status !== "rejected") {
      return;
    }
    setSelectedTaskInstance(taskInstance);
    setCapturedPhotoUri(null);
    setCapturedAt(null);
    setShowCamera(false);
    setSubmissionNote("");
  };

  const handleCloseTaskModal = () => {
    setSelectedTaskInstance(null);
    setCapturedPhotoUri(null);
    setCapturedAt(null);
    setShowCamera(false);
    setSubmissionNote("");
  };

  const ensureCameraPermission = async () => {
    if (!cameraPermission || cameraPermission.status !== "granted") {
      const { status } = await requestCameraPermission();
      return status === "granted";
    }
    return true;
  };

  const handleStartCamera = async () => {
    const granted = await ensureCameraPermission();
    if (!granted) {
      Alert.alert(
        "Permissão necessária",
        "Precisamos de acesso à câmera para tirar a foto da tarefa."
      );
      return;
    }
    setShowCamera(true);
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo: any = await (cameraRef.current as any).takePictureAsync({
        quality: 0.7,
      });
      if (photo?.uri) {
        setCapturedPhotoUri(photo.uri);
        setCapturedAt(new Date().toISOString());
        setShowCamera(false);
      }
    } catch (error) {
      Alert.alert(
        "Erro ao tirar foto",
        "Ocorreu um erro ao capturar a foto. Tente novamente."
      );
    }
  };

  const handleSubmitTaskInstance = async () => {
    if (!profile || !selectedTaskInstance) return;

    if (
      selectedTaskInstance.task?.attachment_required &&
      !capturedPhotoUri
    ) {
      Alert.alert(
        "Foto obrigatória",
        "Esta tarefa exige uma foto tirada agora como prova."
      );
      return;
    }

    try {
      setSubmittingTask(true);
      let proofUrl: string | null = null;

      if (capturedPhotoUri) {
        const response = await fetch(capturedPhotoUri);
        const arrayBuffer = await response.arrayBuffer();
        // Use user ID as folder name to satisfy RLS policy: auth.uid() = foldername
        const fileName = `${profile.id}/${selectedTaskInstance.id}_${Date.now()}.jpg`;

        const { error: uploadError, data } = await supabase.storage
          .from("task-proofs")
          .upload(fileName, arrayBuffer, {
            contentType: "image/jpeg",
          });

        if (uploadError) {
          Alert.alert(
            "Erro no upload",
            uploadError.message || "Não foi possível enviar a foto."
          );
          setSubmittingTask(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("task-proofs")
          .getPublicUrl(data.path);

        proofUrl = publicUrlData.publicUrl;
      }

      const { error: submissionError } = await supabase
        .from("submissions")
        .insert({
          task_instance_id: selectedTaskInstance.id,
          submitted_by: profile.id,
          note: submissionNote.trim() || null,
          proof_url: proofUrl,
          status: "pending",
        });

      if (submissionError) {
        Alert.alert(
          "Erro ao enviar tarefa",
          submissionError.message || "Não foi possível enviar a tarefa."
        );
        setSubmittingTask(false);
        return;
      }

      await supabase
        .from("task_instances")
        .update({ status: "submitted" })
        .eq("id", selectedTaskInstance.id);

      Alert.alert(
        "Tarefa enviada",
        "Sua tarefa foi enviada para aprovação."
      );

      handleCloseTaskModal();
      await loadTasks();
    } catch (error: any) {
      Alert.alert(
        "Erro inesperado",
        error?.message || "Ocorreu um erro ao enviar a tarefa."
      );
    } finally {
      setSubmittingTask(false);
    }
  };

  const getRecurrenceLabel = (taskRecurrence: TaskRecurrence) => {
    const labels: Record<TaskRecurrence, string> = {
      none: "Única",
      daily: "Diária",
      weekly: "Semanal",
      monthly: "Mensal",
    };
    return labels[taskRecurrence];
  };

  const recurrenceOptions: { value: TaskRecurrence; label: string }[] = [
    { value: "none", label: "Tarefa única" },
    { value: "daily", label: "Diária" },
    { value: "weekly", label: "Semanal" },
    { value: "monthly", label: "Mensal" },
  ];

  const weekdayOptions: { value: number; label: string }[] = [
    { value: 1, label: "Segunda-feira" },
    { value: 2, label: "Terça-feira" },
    { value: 3, label: "Quarta-feira" },
    { value: 4, label: "Quinta-feira" },
    { value: 5, label: "Sexta-feira" },
    { value: 6, label: "Sábado" },
    { value: 0, label: "Domingo" },
  ];

  useEffect(() => {
    loadTasks();
  }, [profile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [profile]);

  if (authLoading || (loading && !profile)) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center p-4">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-gray-900 font-bold text-lg mb-2 text-center">Perfil Incompleto</Text>
          <Text className="text-gray-500 mb-6 text-center">
            Se você acabou de criar a conta, vá para a aba "Perfil" para finalizar seu cadastro.
            Caso contrário, tente fazer login novamente.
          </Text>
          <TouchableOpacity 
            onPress={signOut}
            className="bg-red-50 px-6 py-3 rounded-lg border border-red-100"
          >
            <Text className="text-red-600 font-semibold">Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (profile.role === "parent") {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView
          contentContainerClassName="p-4 pb-8"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-bold text-gray-900">
                Gerenciar Tarefas
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                Crie tarefas e recompensas para suas filhas
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowForm(!showForm)}
              className="bg-blue-600 px-3 py-2 rounded-lg"
            >
              <Text className="text-white text-sm font-semibold">
                {showForm ? "Fechar" : "Nova Tarefa"}
              </Text>
            </TouchableOpacity>
          </View>

          {showForm && (
            <View className="bg-white p-4 rounded-xl border border-gray-100 mb-4">
              <Text className="text-xs font-medium text-gray-700 mb-1">
                Título da Tarefa *
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Arrumar a cama"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              />

              <Text className="text-xs font-medium text-gray-700 mb-1 mt-3">
                Valor da Recompensa (R$)
              </Text>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder="0,00"
                keyboardType="decimal-pad"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              />

              <Text className="text-xs font-medium text-gray-700 mb-1 mt-3">
                Descrição (opcional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Descreva como a tarefa deve ser executada..."
                multiline
                textAlignVertical="top"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-h-[80px]"
              />

              <Text className="text-xs font-medium text-gray-700 mb-1 mt-3">
                Recorrência
              </Text>
              <View className="flex-row flex-wrap gap-2 mt-1">
                {recurrenceOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setRecurrence(option.value)}
                    className={`px-3 py-1 rounded-full border ${
                      recurrence === option.value
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={
                        recurrence === option.value
                          ? "text-white text-xs font-medium"
                          : "text-gray-700 text-xs font-medium"
                      }
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(recurrence === "daily" || recurrence === "weekly") && (
                <>
                  <Text className="text-xs font-medium text-gray-700 mb-1 mt-3">
                    Dia da semana
                  </Text>
                  <View className="flex-row flex-wrap gap-2 mt-1">
                    {weekdayOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => setRecurrenceDay(option.value)}
                        className={`px-3 py-1 rounded-full border ${
                          recurrenceDay === option.value
                            ? "bg-blue-600 border-blue-600"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Text
                          className={
                            recurrenceDay === option.value
                              ? "text-white text-xs font-medium"
                              : "text-gray-700 text-xs font-medium"
                          }
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="text-xs font-medium text-gray-700 mb-1 mt-3">
                    Horário
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <TextInput
                      value={recurrenceTime}
                      onChangeText={setRecurrenceTime}
                      placeholder="Ex: 18:00"
                      keyboardType="numbers-and-punctuation"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white mr-3"
                      editable={recurrenceTime !== ""}
                    />
                    <View className="flex-row items-center">
                      <Switch
                        value={recurrenceTime === ""}
                        onValueChange={(val) => setRecurrenceTime(val ? "" : "09:00")}
                      />
                      <Text className="ml-2 text-xs text-gray-700">
                        Qualquer horário
                      </Text>
                    </View>
                  </View>
                </>
              )}

              <View className="flex-row items-center justify-between mt-3">
                <Text className="text-sm text-gray-700">
                  Exigir foto como prova
                </Text>
                <Switch
                  value={attachmentRequired}
                  onValueChange={setAttachmentRequired}
                />
              </View>

              {daughters.length > 0 ? (
                <>
                  <Text className="text-xs font-medium text-gray-700 mb-1 mt-3">
                    Atribuir a:
                  </Text>
                  <View className="flex-row flex-wrap gap-2 mt-1">
                    {daughters.map((daughter) => {
                      const isSelected = selectedAssignees.includes(daughter.id);
                      return (
                        <TouchableOpacity
                          key={daughter.id}
                          onPress={() => toggleAssignee(daughter.id)}
                          className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          {isSelected && (
                            <Check size={12} color="white" style={{ marginRight: 4 }} />
                          )}
                          <Text
                            className={
                              isSelected
                                ? "text-white text-xs font-medium"
                                : "text-gray-700 text-xs font-medium"
                            }
                          >
                            {daughter.display_name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <View className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <Text className="text-yellow-800 text-xs text-center">
                    Nenhuma filha encontrada na família. A tarefa será visível para todos os membros futuros.
                  </Text>
                </View>
              )}

              <View className="flex-row mt-6 space-x-2">
                <TouchableOpacity
                  onPress={handleCreateOrUpdateTask}
                  disabled={creating}
                  className="flex-1 bg-blue-600 py-3 rounded-lg flex-row justify-center items-center"
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold text-center">
                      {editingTaskId ? "Salvar Alterações" : "Criar Tarefa"}
                    </Text>
                  )}
                </TouchableOpacity>
                {editingTaskId && (
                  <TouchableOpacity
                    onPress={resetForm}
                    disabled={creating}
                    className="flex-1 bg-gray-100 py-3 rounded-lg flex-row justify-center items-center"
                  >
                    <Text className="text-gray-700 font-semibold text-center">
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

            {pendingApprovals.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-bold text-gray-900 mb-3">
                  Aprovações Pendentes ({pendingApprovals.length})
                </Text>
                {pendingApprovals.map((instance) => (
                  <View key={instance.id} className="bg-white p-4 rounded-xl border border-orange-200 mb-3 shadow-sm">
                    <View className="flex-row justify-between items-start mb-2">
                      <View>
                         <Text className="text-sm text-orange-600 font-semibold mb-1">
                            {instance.daughter?.profile?.display_name} enviou:
                         </Text>
                         <Text className="text-gray-900 font-bold text-base">
                            {instance.task?.title}
                         </Text>
                         <Text className="text-gray-500 text-xs mt-1">
                            {formatBRL(instance.task?.value_cents || 0)}
                         </Text>
                      </View>
                      <View className="px-2 py-1 bg-orange-100 rounded text-xs">
                        <Text className="text-orange-700 font-medium text-xs">Aguardando</Text>
                      </View>
                    </View>
                    
                    {instance.submissions?.[0]?.note ? (
                        <View className="bg-gray-50 p-2 rounded mb-3">
                            <Text className="text-gray-600 text-sm italic">"{instance.submissions[0].note}"</Text>
                        </View>
                    ) : null}

                    {instance.submissions?.[0]?.proof_url ? (
                        <View className="mb-3">
                            <Text className="text-xs text-gray-500 mb-1">Comprovante:</Text>
                            <Image 
                                source={{ uri: instance.submissions[0].proof_url }} 
                                style={{ width: '100%', height: 200, borderRadius: 8 }} 
                                resizeMode="cover"
                            />
                        </View>
                    ) : null}

                    <View className="flex-row gap-3 mt-2">
                        <TouchableOpacity 
                            onPress={() => handleRejectTask(instance.id)}
                            className="flex-1 bg-red-50 py-2 rounded-lg border border-red-100 items-center flex-row justify-center gap-2"
                        >
                            <X size={18} color="#ef4444" />
                            <Text className="text-red-600 font-semibold">Rejeitar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => handleApproveTask(instance)}
                            className="flex-1 bg-green-600 py-2 rounded-lg items-center flex-row justify-center gap-2"
                        >
                            <Check size={18} color="white" />
                            <Text className="text-white font-semibold">Aprovar</Text>
                        </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

          <View className="bg-white p-4 rounded-xl border border-gray-100">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-gray-900">
                Tarefas Ativas ({parentTasks.length})
              </Text>
            </View>

            {loading ? (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color="#2563eb" />
              </View>
            ) : parentTasks.length === 0 ? (
              <View className="py-6 items-center">
                <Text className="text-gray-500 text-sm text-center">
                  Nenhuma tarefa criada ainda. Toque em "Nova Tarefa" para
                  começar.
                </Text>
              </View>
            ) : (
              parentTasks.map((task) => (
                <View
                  key={task.id}
                  className="py-3 border-b border-gray-100 last:border-b-0"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-3">
                      <Text className="text-gray-900 font-semibold text-base">
                        {task.title}
                      </Text>
                      {task.description ? (
                        <Text
                          className="text-gray-500 text-xs mt-1"
                          numberOfLines={2}
                        >
                          {task.description}
                        </Text>
                      ) : null}
                      <View className="flex-row items-center mt-2 flex-wrap">
                        <Text className="text-green-600 font-semibold text-sm mr-2">
                          {formatBRL(task.value_cents)}
                        </Text>
                        <View className="px-2 py-0.5 rounded-full bg-gray-100 mr-2">
                          <Text className="text-gray-600 text-xs">
                            {getRecurrenceLabel(task.recurrence)}
                          </Text>
                        </View>
                        {task.attachment_required && (
                          <View className="px-2 py-0.5 rounded-full bg-blue-50">
                            <Text className="text-blue-600 text-xs">
                              Prova obrigatória
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-row flex-wrap gap-1 mt-2">
                        {task.assignees && task.assignees.length > 0 ? (
                          task.assignees.map((assigneeId) => {
                            const daughter = daughters.find((d) => d.id === assigneeId);
                            if (!daughter) return null;
                            return (
                              <View
                                key={assigneeId}
                                className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100"
                              >
                                <Text className="text-purple-700 text-[10px]">
                                  {daughter.display_name}
                                </Text>
                              </View>
                            );
                          })
                        ) : (
                          <View className="px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200">
                            <Text className="text-gray-500 text-[10px]">
                              Todas as filhas
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={() => handleEditTask(task)}
                        className="p-2 mr-1"
                      >
                        <Edit size={20} color="#4b5563" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteTask(task.id)}
                        className="p-2"
                      >
                        <Trash2 size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView 
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text className="text-2xl font-bold text-gray-900 mb-4">Minhas Tarefas</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" className="mt-8" />
        ) : tasks.length === 0 ? (
          <View className="bg-white p-8 rounded-xl border border-gray-100 items-center">
            <Text className="text-gray-500 text-center">Nenhuma tarefa encontrada.</Text>
          </View>
        ) : (
          tasks.map((taskInstance) => (
            <TaskCard 
              key={taskInstance.id} 
              taskInstance={taskInstance} 
              onPress={() => handleOpenTaskInstance(taskInstance)}
            />
          ))
        )}
      </ScrollView>

      {selectedTaskInstance && (
        <View className="absolute inset-0 bg-black/60 justify-center">
          <View className="mx-4 bg-white p-4 rounded-xl">
            {selectedTaskInstance.status === 'rejected' && (
              <View className="bg-red-50 p-3 rounded-lg border border-red-100 mb-3">
                <Text className="text-red-700 font-medium text-sm">
                  Tarefa rejeitada. Envie uma nova prova/observação.
                </Text>
              </View>
            )}
            <Text className="text-lg font-bold text-gray-900 mb-2">
              {selectedTaskInstance.task?.title}
            </Text>
            {selectedTaskInstance.task?.description ? (
              <Text className="text-gray-600 text-sm mb-3">
                {selectedTaskInstance.task.description}
              </Text>
            ) : null}
            <Text className="text-gray-800 font-semibold mb-3">
              Recompensa: {formatBRL(selectedTaskInstance.task?.value_cents || 0)}
            </Text>

            <Text className="text-xs font-medium text-gray-700 mb-1">
              Observações (opcional)
            </Text>
            <TextInput
              value={submissionNote}
              onChangeText={setSubmissionNote}
              placeholder="Conte como você executou a tarefa..."
              multiline
              textAlignVertical="top"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white mb-3 min-h-[70px]"
            />

            <View className="mb-4">
              <Text className="text-xs font-medium text-gray-700 mb-2">
                {selectedTaskInstance.task?.attachment_required
                  ? "Foto da tarefa concluída (obrigatória)"
                  : "Foto da tarefa concluída (opcional)"}
              </Text>
              {showCamera ? (
                <View className="h-64 rounded-xl overflow-hidden mb-3">
                  <CameraView
                    ref={cameraRef}
                    style={{ flex: 1 }}
                    facing="back"
                  />
                </View>
              ) : capturedPhotoUri ? (
                <View className="mb-3">
                  <Image
                    source={{ uri: capturedPhotoUri }}
                    style={{ width: "100%", height: 200, borderRadius: 12 }}
                    resizeMode="cover"
                  />
                  {capturedAt && (
                    <Text className="mt-1 text-[11px] text-gray-500">
                      Capturada em:{" "}
                      {new Date(capturedAt).toLocaleString("pt-BR")}
                    </Text>
                  )}
                </View>
              ) : (
                <Text className="text-xs text-gray-500 mb-3">
                  Tire uma foto agora como prova. Não é permitido usar fotos da
                  galeria.
                </Text>
              )}

              <View className="flex-row justify-between">
                {!showCamera && (
                  <TouchableOpacity
                    onPress={handleStartCamera}
                    className="flex-1 bg-gray-800 rounded-lg py-2 mr-2 items-center"
                  >
                    <Text className="text-white font-semibold text-sm">
                      Abrir câmera
                    </Text>
                  </TouchableOpacity>
                )}
                {showCamera && (
                  <TouchableOpacity
                    onPress={handleTakePicture}
                    className="flex-1 bg-blue-600 rounded-lg py-2 mr-2 items-center"
                  >
                    <Text className="text-white font-semibold text-sm">
                      Tirar foto
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View className="flex-row mt-2">
              <TouchableOpacity
                onPress={handleSubmitTaskInstance}
                disabled={submittingTask}
                className={`flex-1 bg-blue-600 rounded-lg py-2 items-center ${
                  submittingTask ? "opacity-70" : ""
                }`}
              >
                <Text className="text-white font-semibold text-sm">
                  {submittingTask ? "Enviando..." : "Enviar tarefa"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCloseTaskModal}
                className="ml-2 flex-1 border border-gray-300 rounded-lg py-2 items-center"
              >
                <Text className="text-gray-700 font-semibold text-sm">
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
