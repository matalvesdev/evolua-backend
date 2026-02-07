'use client';

import { useState } from 'react';
import { Plus, ListTodo, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskForm, TaskList } from '@/components/tasks';
import { useTasks } from '@/hooks';

export default function TarefasPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const { tasks, statistics } = useTasks();

  return (
    <div className="min-h-screen bg-linear-to-br from-[#f6f8fb] via-[#e8edf5] to-[#dce5f0] p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tarefas</h1>
            <p className="text-gray-600 mt-1">
              Gerencie suas tarefas e mantenha-se organizado
            </p>
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            size="lg"
            className="bg-linear-to-r from-primary to-primary-dark shadow-md hover:shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nova Tarefa
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100">
                  <ListTodo className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-100">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.pending}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Concluídas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.completed}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Atrasadas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.overdue}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-100">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.dueToday}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task List with Tabs */}
        <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Minhas Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  Todas ({statistics.total})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pendentes ({statistics.pending})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Concluídas ({statistics.completed})
                </TabsTrigger>
                <TabsTrigger value="overdue">
                  Atrasadas ({statistics.overdue})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <TaskList showFilters />
              </TabsContent>

              <TabsContent value="pending">
                <TaskList
                  tasks={tasks.filter((t) => t.status === 'pending')}
                  showFilters={false}
                />
              </TabsContent>

              <TabsContent value="completed">
                <TaskList
                  tasks={tasks.filter((t) => t.status === 'completed')}
                  showFilters={false}
                />
              </TabsContent>

              <TabsContent value="overdue">
                <TaskList
                  tasks={tasks.filter(
                    (t) =>
                      t.status === 'pending' &&
                      t.dueDate &&
                      new Date(t.dueDate) < new Date()
                  )}
                  showFilters={false}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Task Form Modal */}
      <TaskForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
