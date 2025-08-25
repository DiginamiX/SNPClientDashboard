import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

interface Client {
  id: number
  name: string
  email: string
  avatar?: string
  status: 'active' | 'inactive' | 'paused'
  joinDate: string
  lastActivity: string
  currentProgram?: string
  compliance: {
    workout: number
    nutrition: number
    overall: number
  }
  progress: {
    weightChange: number
    workoutsCompleted: number
    daysActive: number
  }
  package: {
    name: string
    price: number
  }
}

export default function ClientManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClients, setSelectedClients] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'paused'>('all')

  // Mock data - replace with actual API call
  const clients: Client[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
      status: "active",
      joinDate: "2024-01-15",
      lastActivity: "2 hours ago",
      currentProgram: "Weight Loss Program",
      compliance: { workout: 85, nutrition: 78, overall: 82 },
      progress: { weightChange: -5.2, workoutsCompleted: 24, daysActive: 45 },
      package: { name: "Premium", price: 299 }
    },
    {
      id: 2,
      name: "Mike Chen",
      email: "mike.chen@email.com",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      status: "active",
      joinDate: "2024-02-01",
      lastActivity: "1 day ago",
      currentProgram: "Strength Building",
      compliance: { workout: 92, nutrition: 85, overall: 89 },
      progress: { weightChange: 2.8, workoutsCompleted: 18, daysActive: 30 },
      package: { name: "Standard", price: 199 }
    },
    {
      id: 3,
      name: "Emma Wilson",
      email: "emma.wilson@email.com",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      status: "paused",
      joinDate: "2023-12-10",
      lastActivity: "1 week ago",
      currentProgram: "Maintenance Program",
      compliance: { workout: 45, nutrition: 52, overall: 48 },
      progress: { weightChange: -1.2, workoutsCompleted: 8, daysActive: 15 },
      package: { name: "Basic", price: 99 }
    }
  ]

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const toggleClientSelection = (clientId: number) => {
    setSelectedClients(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const selectAllClients = () => {
    setSelectedClients(filteredClients.map(client => client.id))
  }

  const clearSelection = () => {
    setSelectedClients([])
  }

  const getStatusBadge = (status: Client['status']) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      paused: 'destructive'
    } as const

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 80) return 'text-green-500'
    if (compliance >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Client Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your clients and track their progress
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <i className="ri-download-line mr-2" />
            Export
          </Button>
          <Button variant="default">
            <i className="ri-add-line mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search clients by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="paused">Paused</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <i className="ri-grid-line" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <i className="ri-list-check" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedClients.length > 0 && (
            <div className="flex items-center justify-between mt-4 p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
              </span>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <i className="ri-mail-line mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" size="sm">
                  <i className="ri-fitness-line mr-2" />
                  Assign Workout
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clients Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card 
              key={client.id} 
              variant="premium" 
              className={`cursor-pointer transition-all ${
                selectedClients.includes(client.id) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => toggleClientSelection(client.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={client.avatar || '/default-avatar.png'}
                      alt={client.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(client.status)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Program:</span>
                    <p className="font-medium truncate">{client.currentProgram}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Package:</span>
                    <p className="font-medium">${client.package.price}/mo</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Overall Compliance</span>
                    <span className={`font-medium ${getComplianceColor(client.compliance.overall)}`}>
                      {client.compliance.overall}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${client.compliance.overall}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Last active: {client.lastActivity}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <i className="ri-more-line" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <i className="ri-eye-line mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <i className="ri-message-2-line mr-2" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <i className="ri-fitness-line mr-2" />
                        Assign Workout
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <i className="ri-pause-line mr-2" />
                        Pause Program
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4">
                      <input
                        type="checkbox"
                        checked={selectedClients.length === filteredClients.length}
                        onChange={selectedClients.length === filteredClients.length ? clearSelection : selectAllClients}
                      />
                    </th>
                    <th className="text-left p-4">Client</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Program</th>
                    <th className="text-left p-4">Compliance</th>
                    <th className="text-left p-4">Progress</th>
                    <th className="text-left p-4">Last Active</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => toggleClientSelection(client.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={client.avatar || '/default-avatar.png'}
                            alt={client.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(client.status)}</td>
                      <td className="p-4">
                        <p className="font-medium">{client.currentProgram}</p>
                        <p className="text-sm text-muted-foreground">${client.package.price}/mo</p>
                      </td>
                      <td className="p-4">
                        <span className={`font-medium ${getComplianceColor(client.compliance.overall)}`}>
                          {client.compliance.overall}%
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">
                          {client.progress.weightChange > 0 ? '+' : ''}
                          {client.progress.weightChange}kg
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.progress.workoutsCompleted} workouts
                        </p>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {client.lastActivity}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <i className="ri-more-line" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <i className="ri-eye-line mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <i className="ri-message-2-line mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <i className="ri-fitness-line mr-2" />
                              Assign Workout
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <i className="ri-team-line text-6xl text-muted-foreground mb-4 block" />
            <h3 className="text-xl font-semibold mb-2">No clients found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first client'
              }
            </p>
            <Button>
              <i className="ri-add-line mr-2" />
              Add Client
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
